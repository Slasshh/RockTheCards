"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  CLOSE_HOUR,
  getDateKey,
  getSelectableSlots,
  isFrenchHoliday,
  isSlotUnavailable,
  normalizeBufferMinutes,
  normalizeSlotDuration,
  OPEN_HOUR,
  toSlotValue,
} from "@/lib/booking-slots";

type DatePickerProps = {
  allowSameDayBooking?: boolean;
  allowedMonths?: number[];
  bookedSlots: Set<string>;
  bookingBufferMinutes?: number;
  daysToShow?: number;
  disabledDaysByMonth?: Record<number, number[]>;
  disableFrenchHolidays?: boolean;
  disabledMonthDays?: number[];
  disabledWeekdays?: number[];
  selectedDate: string;
  setSelectedDate: (value: string) => void;
  slotDurationMinutes?: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatSlotButtonLabel(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes ? `${hour}h${pad(minutes)}` : `${hour}h`;
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    weekday: "short",
  }).format(date);
}

function subscribeToClientReady(onStoreChange: () => void) {
  queueMicrotask(onStoreChange);

  return () => {};
}

function getClientReadySnapshot() {
  return true;
}

function getServerReadySnapshot() {
  return false;
}

function getAvailableDays(daysToShow: number) {
  const today = new Date();

  return Array.from({ length: daysToShow }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() + index);
    day.setHours(0, 0, 0, 0);

    return {
      dayOfMonth: day.getDate(),
      key: getDateKey(day),
      label: index === 0 ? "Aujourd'hui" : formatDayLabel(day),
      month: day.getMonth() + 1,
      weekday: day.getDay(),
    };
  });
}

export function getSelectedHour(selectedDate: string) {
  return selectedDate ? selectedDate.slice(0, 16) : "";
}

export default function DatePicker({
  allowSameDayBooking = true,
  allowedMonths = [],
  bookedSlots,
  bookingBufferMinutes = 0,
  daysToShow = 14,
  disabledDaysByMonth = {},
  disableFrenchHolidays = false,
  disabledMonthDays = [],
  disabledWeekdays = [],
  selectedDate,
  setSelectedDate,
  slotDurationMinutes = 60,
}: DatePickerProps) {
  const slotDuration = normalizeSlotDuration(slotDurationMinutes);
  const bookingBuffer = normalizeBufferMinutes(bookingBufferMinutes);
  const mounted = useSyncExternalStore(
    subscribeToClientReady,
    getClientReadySnapshot,
    getServerReadySnapshot,
  );
  const days = useMemo(
    () => getAvailableDays(Math.max(1, daysToShow)),
    [daysToShow],
  );
  const todayKey = getDateKey(new Date());
  const [selectedDay, setSelectedDay] = useState(
    days.find(
      (day) => {
        const daySlots = getSelectableSlots(day.key, slotDuration);

        return (
          (allowSameDayBooking || day.key !== todayKey) &&
          (!allowedMonths.length || allowedMonths.includes(day.month)) &&
          !disabledMonthDays.includes(day.dayOfMonth) &&
          !(disabledDaysByMonth[day.month] ?? []).includes(day.dayOfMonth) &&
          !disabledWeekdays.includes(day.weekday) &&
          !(disableFrenchHolidays && isFrenchHoliday(day.key)) &&
          daySlots.some(
            (slot) =>
              !isSlotUnavailable(
                toSlotValue(day.key, slot),
                bookedSlots,
                slotDuration,
                bookingBuffer,
              ),
          )
        );
      },
    )?.key ??
      days[0]?.key ??
      "",
  );
  const selectedDayConfig = days.find((day) => day.key === selectedDay);
  const isSelectedDayDisabled = selectedDayConfig
    ? (!allowSameDayBooking && selectedDayConfig.key === todayKey) ||
      disabledWeekdays.includes(selectedDayConfig.weekday) ||
      (disableFrenchHolidays && isFrenchHoliday(selectedDayConfig.key)) ||
      (allowedMonths.length > 0 &&
        !allowedMonths.includes(selectedDayConfig.month)) ||
      disabledMonthDays.includes(selectedDayConfig.dayOfMonth) ||
      (disabledDaysByMonth[selectedDayConfig.month] ?? []).includes(
        selectedDayConfig.dayOfMonth,
      )
    : false;
  const slots = getSelectableSlots(selectedDay, slotDuration);
  const availableSlots = slots.filter(
    (slot) =>
      !isSlotUnavailable(
        toSlotValue(selectedDay, slot),
        bookedSlots,
        slotDuration,
        bookingBuffer,
      ),
  );
  const selectedHour = getSelectedHour(selectedDate);
  const isSlotBooked = Boolean(
    selectedHour &&
      isSlotUnavailable(selectedHour, bookedSlots, slotDuration, bookingBuffer),
  );
  const allDaySlotsTaken =
    !isSelectedDayDisabled &&
    slots.length > 0 &&
    slots.every((slot) =>
      isSlotUnavailable(
        toSlotValue(selectedDay, slot),
        bookedSlots,
        slotDuration,
        bookingBuffer,
      ),
    );

  if (!mounted) {
    return (
      <div className="grid gap-4 md:col-span-2">
        <input name="preferredDate" type="hidden" value={selectedDate} />
        <div className="rounded-lg border border-[#75C7E7] bg-[#BCE8F5] p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#182B49]">
            Date
          </p>
          <p className="mt-2 text-sm text-[#182B49]">
            Chargement des créneaux disponibles...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:col-span-2">
      <input name="preferredDate" type="hidden" value={selectedDate} />

      <div className="rounded-lg border border-[#75C7E7] bg-[#BCE8F5] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#182B49]">
              Date
            </p>
            <p className="mt-1 text-sm text-[#182B49]">
              Sélectionne un jour disponible.
            </p>
          </div>
          <span className="rounded-full bg-[#182B49] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#FFD35A]">
            {daysToShow} jours
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {days.map((day) => {
            const isSelected = day.key === selectedDay;
            const daySlots = getSelectableSlots(day.key, slotDuration);
            const hasAvailableSlot = daySlots.some(
              (slot) =>
                !isSlotUnavailable(
                  toSlotValue(day.key, slot),
                  bookedSlots,
                  slotDuration,
                  bookingBuffer,
                ),
            );
            const isDisabled =
              (!allowSameDayBooking && day.key === todayKey) ||
              disabledWeekdays.includes(day.weekday) ||
              (disableFrenchHolidays && isFrenchHoliday(day.key)) ||
              (allowedMonths.length > 0 && !allowedMonths.includes(day.month)) ||
              disabledMonthDays.includes(day.dayOfMonth) ||
              (disabledDaysByMonth[day.month] ?? []).includes(day.dayOfMonth) ||
              !hasAvailableSlot;

            return (
              <button
                className={`min-h-12 rounded-md border px-3 text-sm font-semibold transition ${
                  isSelected
                    ? "border-[#182B49] bg-[#182B49] text-[#F4F8FB]"
                    : "border-[#75C7E7] bg-[#F4F8FB] text-[#182B49] hover:border-[#182B49] hover:text-[#182B49]"
                } disabled:cursor-not-allowed disabled:border-[#75C7E7] disabled:bg-[#BCE8F5] disabled:text-[#182B49]`}
                disabled={isDisabled}
                key={day.key}
                onClick={() => {
                  setSelectedDay(day.key);
                  setSelectedDate("");
                }}
                type="button"
              >
                {day.label}
                {isDisabled ? (
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.12em]">
                    {disableFrenchHolidays && isFrenchHoliday(day.key)
                      ? "Férié"
                      : "Indispo"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-[#75C7E7] bg-[#BCE8F5] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#182B49]">
              Créneaux libres
            </p>
            <p className="mt-1 text-sm text-[#182B49]">
              Seuls les créneaux vraiment libres sont affichés.
            </p>
          </div>
          <span className="rounded-full border border-[#75C7E7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#182B49]">
            {OPEN_HOUR}h-{CLOSE_HOUR}h
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {isSelectedDayDisabled ? (
            <p className="col-span-full rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 py-3 text-sm font-semibold text-[#182B49]">
              Ce jour est fermé pour ce produit.
            </p>
          ) : null}

          {!isSelectedDayDisabled && availableSlots.map((slot) => {
            const slotValue = toSlotValue(selectedDay, slot);
            const isSelected = selectedHour === slotValue;

            return (
              <button
                className={`min-h-14 rounded-md border px-3 text-sm font-bold transition ${
                  isSelected
                    ? "border-[#182B49] bg-[#FFD35A] text-[#182B49]"
                    : "border-[#75C7E7] bg-[#F4F8FB] text-[#182B49] hover:border-[#182B49]"
                } disabled:cursor-not-allowed disabled:border-[#75C7E7] disabled:bg-[#BCE8F5] disabled:text-[#182B49]`}
                key={slotValue}
                onClick={() => setSelectedDate(slotValue)}
                type="button"
              >
                {formatSlotButtonLabel(slot)}
              </button>
            );
          })}
        </div>

        {!isSelectedDayDisabled && availableSlots.length === 0 ? (
          <p className="mt-4 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 py-3 text-sm font-semibold text-[#182B49]">
            Plus aucun créneau disponible ce jour. Choisis un autre jour.
          </p>
        ) : null}
      </div>

      {isSlotBooked ? (
        <p className="rounded-md border border-[#182B49] bg-[#BCE8F5] px-4 py-3 text-sm font-semibold text-[#182B49]">
          Cette heure est déjà prise. Choisis un autre créneau.
        </p>
      ) : null}

      {allDaySlotsTaken ? (
        <p className="rounded-md border border-[#75C7E7] bg-[#BCE8F5] px-4 py-3 text-sm font-semibold text-[#182B49]">
          Tous les créneaux de cette journée sont pris.
        </p>
      ) : null}
    </div>
  );
}
