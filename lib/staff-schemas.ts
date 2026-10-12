import { z } from "zod";
import { bookingSources, staffRoles } from "./staff-types";
const uuid = z.string().uuid();
const room = z.string().regex(/^3[0-9]{2}$/);
const money = z.number().int().min(1).max(100_000_000);
const email = z.union([z.string().email().max(254), z.literal("")]).optional();
const phone = z.string().regex(/^\+[1-9][0-9]{7,14}$/);
const optionalText = (length: number) => z.string().trim().max(length).optional();
const source = { source: z.enum(bookingSources), sourceOther: optionalText(100), otaReference: optionalText(100) };
const guest = {
  fullName: z.string().trim().min(2).max(120), phone, email,
  address: z.string().trim().min(5).max(1000), nationality: z.string().trim().min(2).max(80),
  adults: z.number().int().min(1).max(12), children: z.number().int().min(0).max(11),
  idType: z.enum(["aadhaar", "passport", "voter_id", "driving_licence", "pan", "other"]),
  idNumber: z.string().trim().min(4).max(80), passportNumber: optionalText(80), visaNumber: optionalText(80),
  visaExpiry: z.union([z.string().date(), z.literal("")]).optional(), ...source,
};
export const staffChangeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm"), reservationId: uuid }).strict(),
  z.object({ action: z.literal("cancel"), reservationId: uuid }).strict(),
  z.object({ action: z.literal("assign"), reservationId: uuid, rooms: z.array(room).min(1).max(12) }).strict(),
  z.object({ action: z.literal("check_in"), reservationId: uuid, ...guest, expectedCheckOut: z.string().date() }).strict(),
  z.object({ action: z.literal("check_out"), reservationId: uuid, allowBalanceDue: z.boolean().optional(), reason: optionalText(500) }).strict(),
  z.object({ action: z.literal("housekeeping"), roomNumber: room, status: z.enum(["clean", "dirty", "out_of_service"]), housekeeperId: uuid.optional() }).strict(),
  z.object({ action: z.literal("walk_in"), requestId: uuid, roomNumber: room, checkIn: z.string().date(), checkOut: z.string().date(), guests: z.number().int().min(1).max(12), fullName: guest.fullName, phone, email, ...source,
    address: guest.address.optional(), nationality: guest.nationality.optional(), adults: guest.adults.optional(), children: guest.children.optional(),
    advancePaise: z.number().int().min(0).max(100_000_000).optional(), advanceMethod: z.enum(["cash", "card_terminal", "upi_manual"]).optional(), advanceReference: optionalText(120),
  }).strict(),
  z.object({ action: z.literal("extend"), reservationId: uuid, checkOut: z.string().date() }).strict(),
  z.object({ action: z.literal("charge"), reservationId: uuid, requestId: uuid, description: z.string().trim().min(2).max(200), amountPaise: money }).strict(),
  z.object({ action: z.literal("discount"), reservationId: uuid, requestId: uuid, description: z.string().trim().min(2).max(200), amountPaise: money }).strict(),
  z.object({ action: z.literal("manual_payment"), reservationId: uuid, requestId: uuid, amountPaise: money, method: z.enum(["cash", "card_terminal", "upi_manual"]), reference: optionalText(120) }).strict(),
  z.object({ action: z.literal("checkin_correction"), reservationId: uuid, checkedInAt: z.string().datetime({ offset: true }), reason: z.string().trim().min(5).max(500) }).strict(),
  z.object({ action: z.literal("season"), name: z.string().trim().min(2).max(80), startsOn: z.string().date(), endsOn: z.string().date(), soloPaise: money, couplePaise: money, perGuestPaise: money }).strict(),
  z.object({ action: z.literal("settings"), taxRateBps: z.number().int().min(0).max(10000), checkInTime: z.string().regex(/^\d{2}:\d{2}$/), checkOutTime: z.string().regex(/^\d{2}:\d{2}$/), cancellationTerms: z.string().trim().min(20).max(5000), paymentsEnabled: z.boolean(), legalName: optionalText(200), legalAddress: optionalText(1000), gstin: optionalText(15) }).strict(),
]);
export const staffAccountSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), name: z.string().trim().min(2).max(120), username: z.string().trim().regex(/^[a-zA-Z][a-zA-Z0-9_.-]{2,31}$/), role: z.enum(staffRoles), password: z.string().min(12).max(128) }).strict(),
  z.object({ action: z.literal("reset"), userId: uuid, password: z.string().min(12).max(128) }).strict(),
  z.object({ action: z.literal("deactivate"), userId: uuid }).strict(),
]);
export const staffDocumentSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("upload"), reservationId: uuid, side: z.enum(["front", "back"]), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().int().min(1).max(5 * 1024 * 1024) }).strict(),
  z.object({ action: z.literal("register"), reservationId: uuid, side: z.enum(["front", "back"]), path: z.string().min(10).max(200) }).strict(),
  z.object({ action: z.literal("read"), reservationId: uuid, path: z.string().min(10).max(200) }).strict(),
]);
export const staffPaymentSchema = z.object({ reservationId: uuid, kind: z.enum(["link", "qr"]), requestId: uuid }).strict();
export const staffInvoiceSchema = z.object({ reservationId: uuid, operation: z.enum(["create", "share", "revoke", "email"]) }).strict();
export const staffAvailabilitySchema = z.object({ checkIn: z.string().date(), checkOut: z.string().date(), guests: z.number().int().min(1).max(12) }).strict();
