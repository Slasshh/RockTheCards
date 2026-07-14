"use server";

import { redirect } from "next/navigation";
import {
  hasSlotConflict,
  isSelectableBookingDate,
  isValidDate,
  parseDisabledDaysByMonth,
  parseNumberList,
} from "@/lib/booking-slots";
import { parseCustomerPhoneNumber } from "@/lib/phone-number";
import { prisma } from "@/lib/prisma";
import {
  calculateDiscountedPriceCents,
  MIN_CHECKOUT_AMOUNT_CENTS,
  normalizePromotionCode,
} from "@/lib/promotion-pricing";
import { getApplicablePromotionByCode } from "@/lib/promotions";
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
  const phoneInput = String(formData.get("phone") ?? "").trim();
  const phoneCountry = String(formData.get("phoneCountry") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const preferredDateValue = String(formData.get("preferredDate") ?? "");
  const promotionCode = normalizePromotionCode(
    String(formData.get("promotionCode") ?? ""),
  );

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
      (customerFields.includes("phone") && !phoneInput);

    if (missingRequiredField) {
      return {
        ok: false,
        message: "Remplis tous les champs client demandés.",
      };
    }

    const phoneNumber = customerFields.includes("phone")
      ? parseCustomerPhoneNumber(phoneInput, phoneCountry)
      : null;

    if (customerFields.includes("phone") && !phoneNumber) {
      return {
        ok: false,
        message: "Saisis un numéro de téléphone valide pour le pays choisi.",
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

    const promotion = promotionCode
      ? await getApplicablePromotionByCode(promotionCode, consultationId)
      : null;

    if (promotionCode && !promotion) {
      return {
        ok: false,
        message:
          "Ce code promotionnel est invalide, expiré ou indisponible pour ce produit.",
      };
    }

    const originalPriceCents = consultation.price * 100;
    const paidAmountCents = promotion
      ? calculateDiscountedPriceCents(
          originalPriceCents,
          promotion.percentOff,
        )
      : originalPriceCents;

    if (
      !Number.isSafeInteger(originalPriceCents) ||
      paidAmountCents < MIN_CHECKOUT_AMOUNT_CENTS
    ) {
      return {
        ok: false,
        message: "Cette réduction ne peut pas être appliquée à ce produit.",
      };
    }

    const messageChunks = splitMetadataValue(message);
    const metadata: Record<string, string> = {
      consultationId: String(consultationId),
      discountPercent: String(promotion?.percentOff ?? 0),
      email,
      firstName,
      messageChunkCount: String(messageChunks.length),
      name,
      originalPriceCents: String(originalPriceCents),
      paidAmountCents: String(paidAmountCents),
      phone: phoneNumber?.number ?? "",
      preferredDate: preferredDate?.toISOString() ?? "",
      promotionCode: promotion?.code ?? "",
      promotionId: promotion ? String(promotion.id) : "",
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
              description: promotion
                ? `Code ${promotion.code} : -${promotion.percentOff}%`
                : undefined,
              name: consultation.title,
            },
            unit_amount: paidAmountCents,
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
