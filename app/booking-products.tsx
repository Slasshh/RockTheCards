"use client";

import { useActionState, useMemo, useState } from "react";
import DatePicker, { getSelectedHour } from "./date-picker";

type ConsultationProduct = {
  id: number;
  title: string;
  summary: string;
  duration: number | null;
  price: number;
  focus: string;
  badge: string;
};

type BookingState = {
  ok: boolean;
  message: string;
};

type BookingProductsProps = {
  bookedSlots: string[];
  consultations: ConsultationProduct[];
  createBooking: (
    state: BookingState,
    formData: FormData,
  ) => Promise<BookingState>;
};

const initialState = {
  ok: false,
  message: "",
};

export default function BookingProducts({
  bookedSlots,
  consultations,
  createBooking,
}: BookingProductsProps) {
  const [selectedId, setSelectedId] = useState(consultations[0]?.id ?? 0);
  const [selectedDate, setSelectedDate] = useState("");
  const [state, formAction, pending] = useActionState(
    createBooking,
    initialState,
  );
  const bookedSlotSet = useMemo(() => new Set(bookedSlots), [bookedSlots]);
  const selectedConsultation = consultations.find(
    (consultation) => consultation.id === selectedId,
  );
  const selectedHour = getSelectedHour(selectedDate);
  const isSlotBooked = Boolean(selectedHour && bookedSlotSet.has(selectedHour));

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-5 md:grid-cols-2">
        {consultations.map((consultation) => {
          const isSelected = consultation.id === selectedId;

          return (
            <button
              className={`flex min-h-[360px] flex-col rounded-lg border p-6 text-left shadow-sm transition ${
                isSelected
                  ? "border-[#182B49] bg-[#BCE8F5] shadow-md"
                  : "border-[#75C7E7] bg-[#F4F8FB] hover:-translate-y-1 hover:border-[#182B49]"
              }`}
              key={consultation.id}
              onClick={() => {
                setSelectedId(consultation.id);
                document
                  .getElementById("reservation")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-[#182B49] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#FFD35A]">
                  {consultation.badge}
                </span>
                {consultation.duration ? (
                  <span className="text-sm font-semibold text-[#182B49]">
                    {consultation.duration} min
                  </span>
                ) : null}
              </div>
              <h3 className="mt-7 text-2xl font-semibold">
                {consultation.title}
              </h3>
              <p className="mt-4 flex-1 text-sm leading-6 text-[#182B49]">
                {consultation.summary}
              </p>
              <div className="mt-6 flex items-center justify-between">
                <p className="text-3xl font-bold">{consultation.price} EUR</p>
                <span className="rounded-full bg-[#182B49] px-4 py-2 text-sm font-semibold text-[#F4F8FB]">
                  Choisir
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <form
        action={formAction}
        className="grid h-fit gap-4 rounded-lg border border-[#75C7E7] bg-[#F4F8FB] p-5 shadow-sm md:grid-cols-2 lg:sticky lg:top-6"
        id="reservation"
      >
        <div className="md:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
            Réservation
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            {selectedConsultation?.title ?? "Consultation"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#182B49]">
            Choisis une date et une heure. Les heures déjà prises sont bloquées.
          </p>
        </div>

        <input name="consultationId" type="hidden" value={selectedId} />

        <label className="grid gap-2 text-sm font-semibold">
          Nom
          <input
            className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
            name="name"
            placeholder="Ton nom"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Email
          <input
            className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
            name="email"
            placeholder="toi@email.com"
            required
            type="email"
          />
        </label>
        <DatePicker
          bookedSlots={bookedSlotSet}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />

        <label className="grid gap-2 text-sm font-semibold md:col-span-2">
          Message
          <textarea
            className="min-h-32 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 py-3 font-normal outline-none transition focus:border-[#182B49]"
            name="message"
            placeholder="Sujet, question, contexte..."
          />
        </label>
        <button
          className="min-h-12 rounded-full bg-[#182B49] px-6 text-sm font-bold text-[#F4F8FB] transition hover:bg-[#182B49] disabled:cursor-not-allowed disabled:bg-[#182B49] md:col-span-2"
          disabled={pending || isSlotBooked || !selectedDate}
          type="submit"
        >
          {pending ? "Réservation..." : "Réserver ce créneau"}
        </button>

        {state.message ? (
          <p
            className={`rounded-md px-4 py-3 text-sm font-semibold md:col-span-2 ${
              state.ok
                ? "border border-[#75C7E7] bg-[#BCE8F5] text-[#182B49]"
                : "border border-[#182B49] bg-[#BCE8F5] text-[#182B49]"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
