import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import {
  getDateKey,
  hasSlotConflict,
  isSelectableBookingDate,
  parseDisabledDaysByMonth,
  parseNumberList,
} from "@/lib/booking-slots";
import { sendOrderDiscordLog } from "@/lib/discord-order-log";
import { syncPaidBookingToGoogleCalendar } from "@/lib/google-calendar";
import { parseInternationalPhoneNumber } from "@/lib/phone-number";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

const MAX_MESSAGE_CHUNKS = 8;
const BOOKING_LOCK_TIMEOUT_SECONDS = 10;
const BOOKING_LOCK_PATTERN = /^[a-z0-9:._-]+$/i;

type AdvisoryLockRow = {
  acquired: bigint | number | null;
};

function readMetadataValue(
  metadata: Record<string, string> | null,
  key: string,
) {
  return metadata?.[key]?.trim() ?? "";
}

function readMetadataMessage(metadata: Record<string, string> | null) {
  const chunkCount = Number(readMetadataValue(metadata, "messageChunkCount"));

  if (
    !Number.isInteger(chunkCount) ||
    chunkCount < 1 ||
    chunkCount > MAX_MESSAGE_CHUNKS
  ) {
    return "";
  }

  const chunks = Array.from({ length: chunkCount }, (_, index) =>
    metadata?.[`messageChunk${index}`] ?? "",
  );

  if (chunks.some((chunk) => !chunk)) {
    return "";
  }

  return chunks.join("").trim();
}

function parseStripeDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isLockAcquired(value: AdvisoryLockRow["acquired"]) {
  return Number(value) === 1;
}

function paidWebhookError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

function assertSafeLockName(lockName: string) {
  if (lockName.length > 64 || !BOOKING_LOCK_PATTERN.test(lockName)) {
    throw new Error("Invalid booking lock name.");
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 400 });
  }

  let event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.id && session.payment_status === "paid") {
      const metadata = session.metadata;
      const consultationId = Number(readMetadataValue(metadata, "consultationId"));
      const message = readMetadataMessage(metadata);
      const phoneValue = readMetadataValue(metadata, "phone");
      const phoneNumber = phoneValue
        ? parseInternationalPhoneNumber(phoneValue)
        : null;

      if (!Number.isInteger(consultationId) || consultationId < 1 || !message) {
        return paidWebhookError("Paid Stripe session has invalid booking metadata.");
      }

      if (phoneValue && !phoneNumber) {
        return paidWebhookError("Paid Stripe session has an invalid phone number.");
      }

      const preferredDate = parseStripeDate(
        readMetadataValue(metadata, "preferredDate"),
      );

      try {
        const result = await prisma.$transaction(async (tx) => {
          const existingBooking = await tx.booking.findUnique({
            include: {
              consultation: {
                select: {
                  price: true,
                  slotDurationMinutes: true,
                  title: true,
                },
              },
            },
            where: { stripeSessionId: session.id },
          });

          if (existingBooking) {
            return {
              alreadyPaidSlot: existingBooking.orderStatus === "cancelled",
              booking: existingBooking,
              consultation: existingBooking.consultation,
            };
          }

          const consultation = await tx.consultation.findUnique({
            select: {
              allowSameDayBooking: true,
              allowedMonths: true,
              bookingBufferMinutes: true,
              bookingDaysAhead: true,
              bookable: true,
              customerFields: true,
              disabledDaysByMonth: true,
              disabledMonthDays: true,
              disabledWeekdays: true,
              disableFrenchHolidays: true,
              price: true,
              slotDurationMinutes: true,
              title: true,
            },
            where: { id: consultationId },
          });

          if (!consultation) {
            throw new Error("Paid Stripe session references a missing consultation.");
          }

          if (consultation.bookable && !preferredDate) {
            throw new Error("Paid Stripe session is missing a required booking date.");
          }

          const customerFields = (consultation.customerFields ?? "name,email")
            .split(",")
            .filter(Boolean);
          const missingRequiredField =
            (customerFields.includes("firstName") &&
              !readMetadataValue(metadata, "firstName")) ||
            (customerFields.includes("name") &&
              !readMetadataValue(metadata, "name")) ||
            (customerFields.includes("email") &&
              !readMetadataValue(metadata, "email")) ||
            (customerFields.includes("phone") && !phoneNumber);

          if (missingRequiredField) {
            throw new Error(
              "Paid Stripe session is missing required customer fields.",
            );
          }

          if (preferredDate) {
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
                disabledMonthDays: parseNumberList(
                  consultation.disabledMonthDays,
                ),
                disabledWeekdays: parseNumberList(consultation.disabledWeekdays),
                slotDurationMinutes: consultation.slotDurationMinutes,
              })
            ) {
              throw new Error(
                "Paid Stripe session contains a booking date that is no longer selectable.",
              );
            }
          }

          const lockName = preferredDate
            ? `rtc:booking:${consultationId}:${getDateKey(preferredDate)}`
            : `rtc:booking:${consultationId}:session:${session.id.slice(-16)}`;
          assertSafeLockName(lockName);
          const lockResult = await tx.$queryRawUnsafe<AdvisoryLockRow[]>(
            `SELECT GET_LOCK('${lockName}', ${BOOKING_LOCK_TIMEOUT_SECONDS}) AS acquired`,
          );

          if (!isLockAcquired(lockResult[0]?.acquired ?? null)) {
            throw new Error("Could not acquire booking slot lock.");
          }

          try {
            const paidSlots = preferredDate
              ? await tx.booking.findMany({
                  select: { preferredDate: true },
                  where: {
                    consultationId,
                    paymentStatus: "paid",
                    preferredDate: { not: null },
                  },
                })
              : [];
            const alreadyPaidSlot = preferredDate
              ? hasSlotConflict(
                  preferredDate,
                  paidSlots
                    .map((slot) => slot.preferredDate)
                    .filter((date): date is Date => Boolean(date)),
                  consultation.slotDurationMinutes,
                  consultation.bookingBufferMinutes,
                )
              : false;
            const orderStatus = alreadyPaidSlot ? "cancelled" : "confirmed";
            const booking = await tx.booking.create({
              data: {
                consultationId,
                email: readMetadataValue(metadata, "email") || null,
                firstName: readMetadataValue(metadata, "firstName") || null,
                message,
                name: readMetadataValue(metadata, "name") || null,
                orderStatus,
                paymentStatus: "paid",
                phone: phoneNumber?.number ?? null,
                preferredDate,
                stripeSessionId: session.id,
              },
            });

            return { alreadyPaidSlot, booking, consultation };
          } finally {
            await tx.$queryRawUnsafe(`SELECT RELEASE_LOCK('${lockName}')`);
          }
        });

        if (!result) {
          return NextResponse.json({ received: true });
        }

        const postPaymentTasks: Array<{
          name: string;
          promise: Promise<void>;
        }> = [];

        if (!result.alreadyPaidSlot && result.booking.preferredDate) {
          postPaymentTasks.push({
            name: "Google Calendar synchronization",
            promise: syncPaidBookingToGoogleCalendar({
              bookingId: result.booking.id,
              consultationTitle: result.consultation.title,
              email: result.booking.email,
              firstName: result.booking.firstName,
              message: result.booking.message ?? "",
              name: result.booking.name,
              phone: result.booking.phone,
              preferredDate: result.booking.preferredDate,
              slotDurationMinutes: result.consultation.slotDurationMinutes,
              stripeSessionId: session.id,
            }),
          });
        }

        postPaymentTasks.push({
          name: "Discord order notification",
          promise: sendOrderDiscordLog({
            bookingId: result.booking.id,
            consultationTitle: result.consultation.title,
            email: result.booking.email,
            firstName: result.booking.firstName,
            message: result.booking.message ?? "",
            name: result.booking.name,
            paymentStatus: result.alreadyPaidSlot
              ? "payé - conflit de créneau"
              : "payé",
            phone: result.booking.phone,
            preferredDate: result.booking.preferredDate,
            price: result.consultation.price,
            title: result.alreadyPaidSlot
              ? "Paiement reçu - créneau déjà pris"
              : "Commande payée",
          }),
        });

        const postPaymentResults = await Promise.allSettled(
          postPaymentTasks.map((task) => task.promise),
        );

        postPaymentResults.forEach((taskResult, index) => {
          if (taskResult.status === "fulfilled") {
            return;
          }

          const task = postPaymentTasks[index];
          console.error(
            `${task?.name ?? "Post-payment task"} failed:`,
            taskResult.reason instanceof Error
              ? taskResult.reason.message
              : "Unknown error",
          );
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
