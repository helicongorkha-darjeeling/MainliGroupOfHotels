import { z } from "zod";

export const staySearchSchema = z
  .object({
    checkIn: z.string().date(),
    checkOut: z.string().date(),
    guests: z.coerce.number().int().min(1).max(12),
  })
  .refine((value) => value.checkOut > value.checkIn, {
    message: "Checkout must be after check-in.",
    path: ["checkOut"],
  });

export function nightsBetween(checkIn: string, checkOut: string) {
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / 86_400_000);
}

export function hotelToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

export function addHotelDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  if ([year, month, day].some(Number.isNaN) || Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

export function formatHotelDate(value: string) {
  const date = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}
