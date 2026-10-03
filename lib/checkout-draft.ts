import { z } from "zod";
import { guestDetailsSchema } from "./guest-details";
import { getTeestaRoomType, planRoomChoice } from "./room-types";
import { hotelToday, nightsBetween } from "./stay";

export const checkoutDraftIdSchema = z.string().uuid();
export const checkoutDraftInputSchema = guestDetailsSchema.extend({
  draftId: checkoutDraftIdSchema,
  roomType: z.enum(["double-room", "triple-room", "four-person-room", "family-room-sofa"]),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  guests: z.number().int().min(1).max(12),
}).strict().refine((value) => value.checkOut > value.checkIn && nightsBetween(value.checkIn, value.checkOut) <= 366, {
  message: "Choose a valid stay of up to 366 nights.", path: ["checkOut"],
});

export const checkoutDraftReceiptSchema = z.object({
  saved: z.literal(true),
  draftId: z.string().uuid(),
  status: z.literal("draft"),
  savedAt: z.string().datetime({ offset: true }),
});

export type CheckoutDraftInput = z.input<typeof checkoutDraftInputSchema>;
export type CheckoutDraftReceipt = z.infer<typeof checkoutDraftReceiptSchema>;

export function prepareCheckoutDraft(input: unknown, now = new Date()) {
  const details = checkoutDraftInputSchema.parse(input);
  if (details.checkIn < hotelToday(now)) throw new Error("Choose a check-in date that is today or later.");
  const room = getTeestaRoomType(details.roomType)!;
  const plan = planRoomChoice(room, details.guests, nightsBetween(details.checkIn, details.checkOut));
  return { ...details, rooms: plan.rooms, startingTotalPaise: plan.quote?.stayTotalPaise ?? null };
}
