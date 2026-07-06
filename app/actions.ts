"use server";

import { redirect } from "next/navigation";
import {
  hasSlotConflict,
  isSelectableBookingDate,
  isValidDate,
  parseDisabledDaysByMonth,
  parseNumberList,
} from "@/lib/booking-slots";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

const STRIPE_METADATA_CHUNK_SIZE = 450;
const STRIPE_METADATA_MAX_CHUNKS = 8;
const MAX_BOOKING_MESSAGE_LENGTH =
  STRIPE_METADATA_CHUNK_SIZE * STRIPE_METADATA_MAX_CHUNKS;

export type BookingState = {
  ok: boolean;
  message: string;
};

function splitMetadataValue(value: string) {
  const chunks: string[] = [];

  for (let index = 0; index < value.length; index += STRIPE_METADATA_CHUNK_SIZE) {
    chunks.push(value.slice(index, index + STRIPE_METADATA_CHUNK_SIZE));
  }

  return chunks;
}

export async function createBooking(
  _state: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const consultationId = Number(formData.get("consultationId"));
  const name = String(formData.get("name") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const preferredDateValue = String(formData.get("preferredDate") ?? "");

  if (!consultationId || !message) {
    return {
      ok: false,
      message: "Remplis les champs demandés et le message pour réserver.",
    };
  }

  if (message.length > MAX_BOOKING_MESSAGE_LENGTH) {
    return {
      ok: false,
      message: `Ton message est trop long. Limite-le à ${MAX_BOOKING_MESSAGE_LENGTH} caractères.`,
    };
  }

  let checkoutUrl = "";

  try {
    const consultation = await prisma.consultation.findUnique({
      select: {
        bookable: true,
        allowSameDayBooking: true,
        allowedMonths: true,
        bookingDaysAhead: true,
        bookingBufferMinutes: true,
        customerFields: true,
        disabledDaysByMonth: true,
        disabledMonthDays: true,
        disableFrenchHolidays: true,
        disabledWeekdays: true,
        price: true,
        slotDurationMinutes: true,
        title: true,
      },
      where: { id: consultationId },
    });

    if (!consultation) {
      return {
        ok: false,
        message: "Produit introuvable.",
      };
    }

    const customerFields = (consultation.customerFields ?? "name,email")
      .split(",")
      .filter(Boolean);
    const missingRequiredField =
      (customerFields.includes("firstName") && !firstName) ||
      (customerFields.includes("name") && !name) ||
      (customerFields.includes("email") && !email) ||
      (customerFields.includes("phone") && !phone);

    if (missingRequiredField) {
      return {
        ok: false,
        message: "Remplis tous les champs client demandés.",
      };
    }

    if (consultation.bookable && !preferredDateValue) {
      return {
        ok: false,
        message: "Choisis un créneau pour réserver cette consultation.",
      };
    }

    const preferredDate = consultation.bookable
      ? new Date(preferredDateValue)
      : null;

    if (consultation.bookable) {
      if (!preferredDate || !isValidDate(preferredDate)) {
        return {
          ok: false,
          message: "Choisis un créneau valide pour cette consultation.",
        };
      }

      preferredDate.setSeconds(0, 0);

      if (
        !isSelectableBookingDate(preferredDate, {
          allowSameDayBooking: consultation.allowSameDayBooking,
          allowedMonths: parseNumberList(consultation.allowedMonths),
          bookingDaysAhead: consultation.bookingDaysAhead,
          disabledDaysByMonth: parseDisabledDaysByMonth(
            consultation.disabledDaysByMonth,
          ),
          disableFrenchHolidays: consultation.disableFrenchHolidays,
          disabledMonthDays: parseNumberList(consultation.disabledMonthDays),
          disabledWeekdays: parseNumberList(consultation.disabledWeekdays),
          slotDurationMinutes: consultation.slotDurationMinutes,
        })
      ) {
        return {
          ok: false,
          message:
            "Ce créneau n'est pas disponible pour cette consultation.",
        };
      }
    }

    if (preferredDate) {
      const dayStart = new Date(preferredDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(preferredDate);
      dayEnd.setHours(23, 59, 59, 999);
      const existingBookings = await prisma.booking.findMany({
        where: {
          paymentStatus: "paid",
          preferredDate: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        select: { preferredDate: true },
      });
      const existingDates = existingBookings
        .map((booking) => booking.preferredDate)
        .filter((date): date is Date => Boolean(date));

      if (
        hasSlotConflict(
          preferredDate,
          existingDates,
          consultation.slotDurationMinutes,
          consultation.bookingBufferMinutes,
        )
      ) {
        return {
          ok: false,
          message:
            "Ce créneau est déjà pris ou trop proche d'une autre réservation.",
        };
      }
    }

    const messageChunks = splitMetadataValue(message);
    const metadata: Record<string, string> = {
      consultationId: String(consultationId),
      email,
      firstName,
      messageChunkCount: String(messageChunks.length),
      name,
      phone,
      preferredDate: preferredDate?.toISOString() ?? "",
    };

    messageChunks.forEach((chunk, index) => {
      metadata[`messageChunk${index}`] = chunk;
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXTAUTH_URL ??
      "http://localhost:3000";
    const checkout = await getStripe().checkout.sessions.create({
      cancel_url: `${appUrl}/paiement/annule`,
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: consultation.title,
            },
            unit_amount: consultation.price * 100,
          },
          quantity: 1,
        },
      ],
      metadata: {
        ...metadata,
      },
      mode: "payment",
      success_url: `${appUrl}/paiement/succes?session_id={CHECKOUT_SESSION_ID}`,
    });

    checkoutUrl = checkout.url ?? "";
  } catch {
    return {
      ok: false,
      message:
        "Impossible de préparer le paiement. Vérifie Stripe ou choisis une autre heure.",
    };
  }

  if (checkoutUrl) {
    redirect(checkoutUrl);
  }

  return {
    ok: false,
    message: "Stripe n'a pas retourné d'URL de paiement.",
  };
}
