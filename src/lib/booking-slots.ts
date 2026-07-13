export const OPEN_HOUR = 9;
export const CLOSE_HOUR = 19;
const OPEN_MINUTES = OPEN_HOUR * 60;
const CLOSE_MINUTES = CLOSE_HOUR * 60;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getDayMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

export function normalizeSlotDuration(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 60;
}

export function normalizeBufferMinutes(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function formatMinutes(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${pad(hour)}:${pad(minutes)}`;
}

export function toSlotValue(dayKey: string, minutes: number) {
  return `${dayKey}T${formatMinutes(minutes)}`;
}

function parseSlotValue(value: string) {
  const [dayKey, timeValue] = value.split("T");
  const [hour, minutes] = (timeValue ?? "").split(":").map(Number);

  if (!dayKey || !Number.isFinite(hour) || !Number.isFinite(minutes)) {
    return null;
  }

  return {
    dayKey,
    minutes: hour * 60 + minutes,
  };
}

function isSlotBlockedByBooking(
  slotValue: string,
  bookedSlot: string,
  slotDurationMinutes: number,
  bookingBufferMinutes: number,
) {
  const slot = parseSlotValue(slotValue);
  const booked = parseSlotValue(bookedSlot);

  if (!slot || !booked || slot.dayKey !== booked.dayKey) {
    return false;
  }

  const slotStart = slot.minutes;
  const slotEnd = slotStart + slotDurationMinutes;
  const blockedStart = booked.minutes - bookingBufferMinutes;
  const blockedEnd =
    booked.minutes + slotDurationMinutes + bookingBufferMinutes;

  return slotStart < blockedEnd && slotEnd > blockedStart;
}

export function isSlotUnavailable(
  slotValue: string,
  bookedSlots: Set<string>,
  slotDurationMinutes: number,
  bookingBufferMinutes: number,
) {
  return Array.from(bookedSlots).some((bookedSlot) =>
    isSlotBlockedByBooking(
      slotValue,
      bookedSlot,
      slotDurationMinutes,
      bookingBufferMinutes,
    ),
  );
}

export function getSelectableSlots(
  dayKey: string,
  slotDurationMinutes: number,
  now = new Date(),
) {
  const duration = normalizeSlotDuration(slotDurationMinutes);
  const todayKey = getDateKey(now);
  const minimumMinutes =
    dayKey === todayKey
      ? now.getHours() * 60 + now.getMinutes() + 1
      : OPEN_MINUTES;
  const roundedMinimum =
    minimumMinutes <= OPEN_MINUTES
      ? OPEN_MINUTES
      : OPEN_MINUTES +
        Math.ceil((minimumMinutes - OPEN_MINUTES) / duration) * duration;
  const startMinutes = Math.max(OPEN_MINUTES, roundedMinimum);
  const lastStart = CLOSE_MINUTES - duration;

  if (startMinutes > lastStart) {
    return [];
  }

  return Array.from(
    { length: Math.floor((lastStart - startMinutes) / duration) + 1 },
    (_, index) => startMinutes + index * duration,
  );
}

export function isFrenchHoliday(dayKey: string) {
  const [, month, day] = dayKey.split("-").map(Number);
  const fixedHolidays = new Set([
    "1-1",
    "5-1",
    "5-8",
    "7-14",
    "8-15",
    "11-1",
    "11-11",
    "12-25",
  ]);

  return fixedHolidays.has(`${month}-${day}`);
}

export function parseNumberList(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
}

export function parseDisabledDaysByMonth(value: string | null) {
  return (value ?? "").split(",").reduce<Record<number, number[]>>(
    (accumulator, item) => {
      const [monthValue, dayValue] = item.split(":");
      const month = Number(monthValue);
      const day = Number(dayValue);

      if (Number.isInteger(month) && Number.isInteger(day)) {
        accumulator[month] = [...(accumulator[month] ?? []), day];
      }

      return accumulator;
    },
    {},
  );
}

type BookingSlotRules = {
  allowSameDayBooking: boolean;
  allowedMonths: number[];
  bookingDaysAhead: number;
  disabledDaysByMonth: Record<number, number[]>;
  disableFrenchHolidays: boolean;
  disabledMonthDays: number[];
  disabledWeekdays: number[];
  slotDurationMinutes: number;
  now?: Date;
};

export function isSelectableBookingDate(
  preferredDate: Date,
  rules: BookingSlotRules,
) {
  if (!isValidDate(preferredDate)) {
    return false;
  }

  const now = rules.now ?? new Date();
  const selectedDay = new Date(preferredDate);
  selectedDay.setHours(0, 0, 0, 0);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const lastSelectableDay = new Date(today);
  lastSelectableDay.setDate(
    today.getDate() + Math.max(1, rules.bookingDaysAhead) - 1,
  );

  if (selectedDay < today || selectedDay > lastSelectableDay) {
    return false;
  }

  if (
    !rules.allowSameDayBooking &&
    getDateKey(selectedDay) === getDateKey(today)
  ) {
    return false;
  }

  const dayKey = getDateKey(preferredDate);
  const month = preferredDate.getMonth() + 1;
  const dayOfMonth = preferredDate.getDate();
  const weekday = preferredDate.getDay();

  if (
    (rules.allowedMonths.length > 0 && !rules.allowedMonths.includes(month)) ||
    rules.disabledMonthDays.includes(dayOfMonth) ||
    (rules.disabledDaysByMonth[month] ?? []).includes(dayOfMonth) ||
    rules.disabledWeekdays.includes(weekday) ||
    (rules.disableFrenchHolidays && isFrenchHoliday(dayKey))
  ) {
    return false;
  }

  return getSelectableSlots(dayKey, rules.slotDurationMinutes, now).includes(
    getDayMinutes(preferredDate),
  );
}

export function hasSlotConflict(
  preferredDate: Date,
  existingDates: Date[],
  slotDurationMinutes: number,
  bookingBufferMinutes: number,
) {
  const preferredDay = getDateKey(preferredDate);
  const slotStart = getDayMinutes(preferredDate);
  const slotEnd = slotStart + slotDurationMinutes;

  return existingDates.some((existingDate) => {
    if (getDateKey(existingDate) !== preferredDay) {
      return false;
    }

    const blockedStart = getDayMinutes(existingDate) - bookingBufferMinutes;
    const blockedEnd =
      getDayMinutes(existingDate) + slotDurationMinutes + bookingBufferMinutes;

    return slotStart < blockedEnd && slotEnd > blockedStart;
  });
}
