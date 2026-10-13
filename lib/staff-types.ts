import type { Reservation } from "./reservations";

export const staffRoles = ["manager", "reception", "housekeeping"] as const;
export type StaffRole = typeof staffRoles[number];
export type HousekeepingStatus = "dirty" | "clean" | "out_of_service" | "unknown";
export type RoomOccupancy = "vacant" | "occupied" | "departing_today" | "arriving_today";
export const bookingSources = ["direct_website", "walk_in", "phone", "makemytrip", "goibibo", "booking_com", "agoda", "airbnb", "expedia", "other"] as const;
export type BookingSource = typeof bookingSources[number];
export type SafeStaffRoom = { number: string; category: string; name?: string; active: boolean; housekeeping: HousekeepingStatus; occupancy: RoomOccupancy };
export type StaffRoom = SafeStaffRoom & { reservation_id?: string | null; checked_in_at?: string | null; expected_check_out?: string | null; source?: BookingSource | null };
export type StaffMember = { user_id: string; name: string; username: string | null; role: StaffRole; active: boolean };
export type StaffStay = {
  guest_profile_id?: string | null;
  reservation_id: string; source: BookingSource; source_other: string | null; ota_reference: string | null;
  address: string | null; nationality: string | null; adults: number | null; children: number | null; id_type: string | null; id_number: string | null;
  passport_number: string | null; visa_number: string | null; visa_expiry: string | null;
  checked_in_at: string | null; checked_in_by: string | null; expected_check_out: string;
  checked_out_at: string | null; checked_out_by: string | null; allow_balance_due: boolean; allow_balance_by: string | null;
  id_front_path: string | null; id_back_path: string | null;
};
/** Private per-stay registration. Aadhaar is already masked by the gateway/database. */
export type StaffGuestProfile = {
  id: string; reservation_id: string; full_name: string; phone: string; email: string;
  address: string; nationality: string; adults: number; children: number;
  id_type: string; id_number: string; passport_number: string | null; visa_number: string | null; visa_expiry: string | null;
  created_at: string; updated_at: string;
};
export type StaffCheckOutResult = { saved: true; invoiceId: string; invoice: StaffInvoice; folio: StaffFolio };
export type StaffRoomCheckInResult = { saved: true; reservationId: string; guestProfileId: string; reservation: Reservation; folio: StaffFolio };
export type StaffFolioItem = { id: string; reservation_id: string; kind: "charge" | "discount"; description: string; amount_paise: number; tax_rate_bps: number | null; created_by: string; created_at: string };
export type StaffFolioPayment = { id: string; reservation_id: string; method: "cash" | "card_terminal" | "upi_manual" | "razorpay"; amount_paise: number; reference: string | null; received_by: string | null; received_at: string };
export type StaffFolio = { reservation_id: string; room_subtotal_paise: number; extras_paise: number; discount_paise: number; taxable_paise: number; tax_rate_bps: number | null; tax_paise: number | null; total_paise: number; paid_paise: number; balance_paise: number; credit_paise?: number; tax_confirmed: boolean };
export type InvoiceSnapshot = { guest_name: string; address: string | null; check_in: string; check_out: string; rooms: string[]; folio: StaffFolio; legal_name: string; legal_address: string; gstin: string | null; items?: Pick<StaffFolioItem, "kind" | "description" | "amount_paise">[]; payments?: {method: StaffFolioPayment["method"]; amount_paise: number; reference?: string | null; received_at: string | null}[]; nightly_prices?: {date: string; amountPaise: number; rateName: string}[] };
export type StaffInvoice = { id: string; reservation_id: string; number: string; financial_year: string; sequence: number; snapshot: InvoiceSnapshot; issued_at: string; issued_by: string; share_enabled: boolean };
export type PrintableInvoice = Pick<StaffInvoice, "number" | "issued_at" | "snapshot">;
export type StaffBalanceRequest = { id: string; reservation_id: string; kind: "payment_link" | "upi_qr"; amount_paise: number; created_at?: string; expires_at: string; paid_at: string | null; review_reason: string | null; provider_id?: string | null; provider_payment_id?: string | null };
export type StaffSettings = {
  tax_rate_bps: number | null; check_in_time: string | null; check_out_time: string | null;
  cancellation_terms: string | null; payments_enabled: boolean; legal_name?: string | null; legal_address?: string | null; gstin?: string | null;
};
export type HotelOperationsData = {
  role: "manager" | "reception"; emailReady: boolean; paymentReady: boolean; schedulerReady: boolean;
  staffCoreReady?: boolean; rooms: StaffRoom[]; reservations: Reservation[];
  categories: {code: string; name: string; capacity: number; online_enabled: boolean}[];
  assignments: {reservation_id: string; room_number: string}[];
  seasons: {id: string; name: string; starts_on: string; ends_on: string; solo_paise: number; couple_paise: number; group_per_guest_paise: number; active: boolean}[];
  settings: StaffSettings; stays?: StaffStay[]; staffMembers?: StaffMember[]; folioItems?: StaffFolioItem[];
  folioPayments?: StaffFolioPayment[]; folios?: StaffFolio[]; invoices?: StaffInvoice[]; balanceRequests?: StaffBalanceRequest[]; guestProfiles?: StaffGuestProfile[];
};
export type StaffHousekeepingData = { role: "housekeeping"; rooms: SafeStaffRoom[]; staffCoreReady?: boolean };
export type StaffAccessData = HotelOperationsData | StaffHousekeepingData;

export function isStaffRole(value: unknown): value is StaffRole { return staffRoles.some(role => role === value); }
export function staffHome(role: StaffRole) { return role === "housekeeping" ? "/staff/housekeeping" : "/staff/operations"; }
