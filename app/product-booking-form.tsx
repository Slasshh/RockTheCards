"use client";

import { useActionState, useMemo, useState } from "react";
import type { PhoneCountryOption } from "@/lib/phone-number";
import type { BookingState } from "./actions";
import DatePicker, { getSelectedHour } from "./date-picker";
import PhoneCountryPicker from "./phone-country-picker";

type ProductBookingFormProps = {
  allowSameDayBooking: boolean;
  allowedMonths: number[];
  bookedSlots: string[];
  bookable: boolean;
  bookingDaysAhead: number;
  bookingBufferMinutes: number;
  consultationId: number;
  consultationImageUrl: string | null;
  consultationTitle: string;
  customerFields: string[];
  createBooking: (
    state: BookingState,
    formData: FormData,
  ) => Promise<BookingState>;
  disabledDaysByMonth: Record<number, number[]>;
  disableFrenchHolidays: boolean;
  disabledMonthDays: number[];
  disabledWeekdays: number[];
  phoneCountryOptions: readonly PhoneCountryOption[];
  slotDurationMinutes: number;
};

const initialState = {
  ok: false,
  message: "",
};

export default function ProductBookingForm({
  allowSameDayBooking,
  allowedMonths,
  bookedSlots,
  bookable,
  bookingDaysAhead,
  bookingBufferMinutes,
  consultationId,
  consultationImageUrl,
  consultationTitle,
  customerFields,
  createBooking,
  disabledDaysByMonth,
  disableFrenchHolidays,
  disabledMonthDays,
  disabledWeekdays,
  phoneCountryOptions,
  slotDurationMinutes,
}: ProductBookingFormProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [state, formAction, pending] = useActionState(
    createBooking,
    initialState,
  );
  const bookedSlotSet = useMemo(() => new Set(bookedSlots), [bookedSlots]);
  const selectedHour = getSelectedHour(selectedDate);
  const isSlotBooked = Boolean(selectedHour && bookedSlotSet.has(selectedHour));
  const enabledFields = customerFields.length
    ? customerFields
    : ["name", "email"];

  return (
    <form
      action={formAction}
      className="product-booking-form grid self-start gap-5 rounded-lg p-5 md:grid-cols-2 md:p-6 lg:sticky lg:top-28"
      id="reservation"
      suppressHydrationWarning
    >
      <div className="product-booking-header md:col-span-2">
        <div
          aria-hidden="true"
          className="product-booking-logo"
          style={{
            backgroundImage: `url(${consultationImageUrl || "/card-spread.svg"})`,
          }}
        />
        <div>
          <p className="product-booking-eyebrow">Réservation</p>
          <h2 className="mt-3 text-3xl font-black text-[#182B49]">
            {consultationTitle}
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#425D78]">
            {bookable
              ? "Choisis une date et une heure. Les créneaux déjà pris disparaissent automatiquement."
              : "Laisse ton message pour la consultation, sans choisir de créneau."}
          </p>
        </div>
      </div>

      <input name="consultationId" type="hidden" value={consultationId} />

      {enabledFields.includes("firstName") ? (
        <label className="grid gap-2 text-sm font-bold" suppressHydrationWarning>
          Prénom
          <input
            name="firstName"
            placeholder="Ton prénom"
            required
            suppressHydrationWarning
          />
        </label>
      ) : null}
      {enabledFields.includes("name") ? (
        <label className="grid gap-2 text-sm font-bold" suppressHydrationWarning>
          Nom
          <input
            name="name"
            placeholder="Ton nom"
            required
            suppressHydrationWarning
          />
        </label>
      ) : null}
      {enabledFields.includes("email") ? (
        <label className="grid gap-2 text-sm font-bold" suppressHydrationWarning>
          Email
          <input
            name="email"
            placeholder="toi@email.com"
            required
            suppressHydrationWarning
            type="email"
          />
        </label>
      ) : null}
      {enabledFields.includes("phone") ? (
        <fieldset className="product-phone-field" suppressHydrationWarning>
          <legend>Téléphone</legend>
          <div className="product-phone-control">
            <PhoneCountryPicker countries={phoneCountryOptions} />
            <input
              aria-label="Numéro de téléphone"
              autoComplete="tel-national"
              inputMode="tel"
              maxLength={32}
              name="phone"
              placeholder="06 12 34 56 78"
              required
              suppressHydrationWarning
              type="tel"
            />
          </div>
        </fieldset>
      ) : null}

      {bookable ? (
        <DatePicker
          allowSameDayBooking={allowSameDayBooking}
          allowedMonths={allowedMonths}
          bookedSlots={bookedSlotSet}
          bookingBufferMinutes={bookingBufferMinutes}
          daysToShow={bookingDaysAhead}
          disabledDaysByMonth={disabledDaysByMonth}
          disableFrenchHolidays={disableFrenchHolidays}
          disabledMonthDays={disabledMonthDays}
          disabledWeekdays={disabledWeekdays}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          slotDurationMinutes={slotDurationMinutes}
        />
      ) : (
        <div className="product-booking-note md:col-span-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#182B49]">
            Consultation sans créneau
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#425D78]">
            Pour ce produit, tu envoies ton message sans choisir de date. La
            consultation sera traitée à partir de ton contexte.
          </p>
          <input name="preferredDate" type="hidden" value="" />
        </div>
      )}

      <label className="grid gap-2 text-sm font-bold md:col-span-2">
        Message
        <textarea
          className={bookable ? "min-h-32" : "min-h-28"}
          maxLength={3600}
          name="message"
          placeholder="Sujet, question, contexte..."
          required
          suppressHydrationWarning
        />
      </label>
      <button
        className="product-booking-submit md:col-span-2"
        disabled={pending || isSlotBooked || (bookable && !selectedDate)}
        type="submit"
      >
        {pending ? "Préparation..." : "Procéder au paiement"}
      </button>

      {state.message ? (
        <p
          className={`product-booking-state md:col-span-2 ${
            state.ok ? "product-booking-state-ok" : "product-booking-state-error"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
