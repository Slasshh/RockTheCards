import { createHash } from "node:crypto";
import { google } from "googleapis";
import {
  authorizeGoogleOAuthClient,
  createGoogleOAuthClient,
  GOOGLE_CALENDAR_CONNECTION_ID,
} from "@/lib/google-calendar-oauth";
import { prisma } from "@/lib/prisma";

const MAX_SLOT_DURATION_MINUTES = 24 * 60;

export type PaidBookingCalendarEvent = {
  bookingId: number;
  consultationTitle: string;
  email: string | null;
  firstName: string | null;
  message: string;
  name: string | null;
  phone: string | null;
  preferredDate: Date;
  slotDurationMinutes: number;
  stripeSessionId: string;
};

function readTimeZone() {
  const timeZone =
    process.env.GOOGLE_CALENDAR_TIME_ZONE?.trim() || "Europe/Paris";

  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone }).format();
  } catch {
    throw new Error("GOOGLE_CALENDAR_TIME_ZONE must be a valid IANA time zone.");
  }

  return timeZone;
}

function readHttpStatus(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const code = Reflect.get(error, "code");

  if (typeof code === "number") {
    return code;
  }

  if (typeof code === "string" && /^\d{3}$/.test(code)) {
    return Number(code);
  }

  const response = Reflect.get(error, "response");

  if (!response || typeof response !== "object") {
    return null;
  }

  const status = Reflect.get(response, "status");

  return typeof status === "number" ? status : null;
}

function formatCustomerName(event: PaidBookingCalendarEvent) {
  return [event.firstName, event.name].filter(Boolean).join(" ") || "Non renseigné";
}

function buildDescription(event: PaidBookingCalendarEvent) {
  return [
    `Commande #${event.bookingId}`,
    `Client : ${formatCustomerName(event)}`,
    `E-mail : ${event.email || "Non renseigné"}`,
    `Téléphone : ${event.phone || "Non renseigné"}`,
    "",
    "Demande :",
    event.message || "Non renseignée",
  ].join("\n");
}

export function getGoogleCalendarEventId(stripeSessionId: string) {
  return `rtc${createHash("sha256").update(stripeSessionId).digest("hex")}`;
}

export async function syncPaidBookingToGoogleCalendar(
  event: PaidBookingCalendarEvent,
) {
  if (!event.stripeSessionId.trim()) {
    throw new Error("A Stripe session ID is required for Google Calendar sync.");
  }

  if (Number.isNaN(event.preferredDate.getTime())) {
    throw new Error("The booking date is invalid for Google Calendar sync.");
  }

  if (
    !Number.isInteger(event.slotDurationMinutes) ||
    event.slotDurationMinutes < 1 ||
    event.slotDurationMinutes > MAX_SLOT_DURATION_MINUTES
  ) {
    throw new Error("The booking duration is invalid for Google Calendar sync.");
  }

  const connection = await prisma.googleCalendarConnection.findUnique({
    select: { encryptedRefreshToken: true },
    where: { id: GOOGLE_CALENDAR_CONNECTION_ID },
  });

  if (!connection) {
    return;
  }

  const timeZone = readTimeZone();
  const auth = authorizeGoogleOAuthClient(
    createGoogleOAuthClient(),
    connection.encryptedRefreshToken,
  );
  const calendar = google.calendar({ auth, version: "v3" });
  const start = new Date(event.preferredDate);
  const end = new Date(
    start.getTime() + event.slotDurationMinutes * 60 * 1000,
  );

  try {
    await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        description: buildDescription(event),
        end: {
          dateTime: end.toISOString(),
          timeZone,
        },
        extendedProperties: {
          private: {
            bookingId: String(event.bookingId),
            stripeSessionId: event.stripeSessionId,
          },
        },
        id: getGoogleCalendarEventId(event.stripeSessionId),
        reminders: { useDefault: true },
        start: {
          dateTime: start.toISOString(),
          timeZone,
        },
        status: "confirmed",
        summary: `RockTheCards · ${event.consultationTitle}`,
        transparency: "opaque",
        visibility: "private",
      },
      sendUpdates: "none",
    });
  } catch (error) {
    if (readHttpStatus(error) === 409) {
      return;
    }

    throw error;
  }
}
