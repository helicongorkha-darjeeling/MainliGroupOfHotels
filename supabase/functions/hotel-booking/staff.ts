import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2.117.2";

export type StaffRole = "manager" | "reception" | "housekeeping";
export type StaffInput = { action: string; [key: string]: unknown };
export type StaffDependencies = {
  db: SupabaseClient;
  user: Pick<User, "id">;
  role: StaffRole;
  env: (name: string) => string | undefined;
  provider: (path: string, options?: RequestInit) => Promise<Record<string, unknown>>;
  reply: (body: unknown, status?: number) => Response;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const photoTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const photoBucket = "hotel-guest-id";
const photoLimit = 5 * 1024 * 1024;
const managerChanges = new Set(["discount", "checkin_correction", "allow_balance_due", "settings", "season"]);
const staffChanges = new Set(["confirm", "cancel", "check_in", "check_out", "assign", "housekeeping", "walk_in", "extend", "charge", "discount", "manual_payment", "checkin_correction", "allow_balance_due", "settings", "season"]);

export function isStaffRole(value: unknown): value is StaffRole {
  return value === "manager" || value === "reception" || value === "housekeeping";
}
export function paymentReviewNotice(status: unknown) {
  return status === "payment_review"
    ? "Your booking is not confirmed. The hotel must resolve or refund the captured payment. Do not pay again."
    : "A captured payment needs front-desk review. Contact the hotel. Do not pay again.";
}
export function staffActionAllowed(role: StaffRole, action: string, change?: unknown) {
  if (role === "housekeeping") return ["staff-role", "staff", "housekeeping"].includes(action);
  if (action === "staff-account") return role === "manager";
  if (action === "staff-change") {
    const name = asObject(change).action;
    if (typeof name !== "string" || !staffChanges.has(name)) return false;
    return !managerChanges.has(name) || role === "manager";
  }
  return ["staff-role", "staff", "housekeeping", "staff-availability", "staff-id-upload", "staff-id-register", "staff-id-read", "staff-balance-payment", "staff-invoice"].includes(action);
}
function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function rpcFailure(error: { code: string; message: string }, reply: StaffDependencies["reply"]) {
  const statuses: Record<string, number> = { PT400: 400, PT401: 401, PT403: 403, PT404: 404, PT409: 409, PT429: 429, PT503: 503 };
  return reply({ error: statuses[error.code] ? error.message : "Staff operation unavailable.", code: error.code }, statuses[error.code] ?? 503);
}
export async function sha256(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map(n => n.toString(16).padStart(2, "0")).join("");
}
export function validPhotoPath(path: unknown, reservationId: unknown, side?: unknown): path is string {
  if (typeof path !== "string" || typeof reservationId !== "string" || !uuid.test(reservationId)) return false;
  const parts = path.split("/");
  if (parts.length !== 3 || parts[0] !== reservationId || !uuid.test(parts[1])) return false;
  const match = /^([0-9a-f-]+)\.(front|back)\.(jpg|png|webp)$/.exec(parts[2]);
  return !!match && uuid.test(match[1]) && (side === undefined || match[2] === side);
}
export async function staffLogin(input: StaffInput, deps: Pick<StaffDependencies, "db" | "reply"> & { signIn: (email: string, password: string) => Promise<{ userId: string | null; session: Record<string, unknown> | null }> }) {
  const { db, reply } = deps;
  const username = typeof input.username === "string" ? input.username.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const invalid = () => reply({ error: "Sign-in failed. Check your username and password." }, 401);
  if (!username || username.length > 254 || !password || password.length > 128) return invalid();
  // A global distributed bucket cannot be bypassed by spoofing a forwarded IP header.
  const { data: limit, error: limitError } = await db.rpc("hotel_staff_login_attempt", {
    identifier_hash: await sha256(username), network_hash: await sha256("mainali-staff-login-global"),
  });
  if (limitError) return reply({ error: "Staff sign-in is temporarily unavailable." }, 503);
  if (!limit?.allowed) return reply({ error: "Too many sign-in attempts. Wait a few minutes and retry." }, 429);
  let query = db.from("hotel_staff").select("user_id,role,auth_email").eq("active", true);
  query = username === "admin" ? query.eq("auth_email", "helicongorkha@gmail.com") : username.includes("@") ? query.eq("auth_email", username) : query.eq("username", username);
  const { data: staff, error } = await query.maybeSingle();
  if (error || !staff || !isStaffRole(staff.role) || typeof staff.auth_email !== "string") return invalid();
  const auth = await deps.signIn(staff.auth_email, password);
  if (auth.userId !== staff.user_id || !auth.session) return invalid();
  // Re-read after Auth so account deactivation during password verification fails closed.
  const { data: current } = await db.from("hotel_staff").select("role").eq("user_id", auth.userId).eq("active", true).maybeSingle();
  if (!current || !isStaffRole(current.role)) return invalid();
  const { access_token, refresh_token, expires_at } = auth.session;
  if (typeof access_token !== "string" || typeof refresh_token !== "string") return invalid();
  return reply({ data: { session: { access_token, refresh_token, expires_at }, role: current.role } });
}

export async function publicInvoice(input: StaffInput, deps: Pick<StaffDependencies, "db" | "reply">) {
  const token = typeof input.token === "string" ? input.token : "";
  if (!/^[a-f0-9]{64}$/.test(token)) return deps.reply({ error: "Invoice link unavailable." }, 404);
  const { data, error } = await deps.db.rpc("hotel_invoice_public", { token_hash: await sha256(token) });
  if (error || !data) return deps.reply({ error: "Invoice link unavailable." }, 404);
  return deps.reply({ data });
}

export async function handleStaffAction(input: StaffInput, deps: StaffDependencies): Promise<Response> {
  const { db, user, role, reply } = deps;
  if (!staffActionAllowed(role, input.action, input.change)) return reply({ error: "This staff role cannot perform that action." }, 403);
  if (input.action === "staff-role") return reply({ data: { role } });
  if (input.action === "staff" || input.action === "housekeeping") {
    // Preserve the front desk's immediate expiry sweep; housekeeping reads never mutate.
    if (role !== "housekeeping" && input.action === "staff") {
      const { error: expiryError } = await db.rpc("hotel_expire_holds");
      if (expiryError) return rpcFailure(expiryError, reply);
    }
    const { data, error } = await db.rpc("hotel_staff_snapshot", { actor: user.id });
    if (error) return rpcFailure(error, reply);
    if (role === "housekeeping") {
      // Project each room explicitly even if a future RPC accidentally returns extra fields.
      const rooms = (Array.isArray(data?.rooms) ? data.rooms : []).map((r: Record<string, unknown>) => ({ number: r.number, category: r.category, name: r.name, active: r.active, housekeeping: r.housekeeping, occupancy: r.occupancy }));
      return reply({ data: { role, rooms, staffCoreReady: true } });
    }
    return reply({ data: { ...data, role, staffCoreReady: true, emailReady: !!deps.env("RESEND_API_KEY") && !!deps.env("RESEND_FROM_EMAIL"), paymentReady: !!deps.env("RAZORPAY_KEY_ID") && !!deps.env("RAZORPAY_KEY_SECRET") && !!deps.env("RAZORPAY_WEBHOOK_SECRET"), schedulerReady: !!deps.env("HOTEL_CRON_SECRET") } });
  }
  if (input.action === "staff-change") {
    const { data, error } = await db.rpc("hotel_staff_change", { actor: user.id, change: input.change });
    return error ? rpcFailure(error, reply) : reply({ data });
  }
  if (input.action === "staff-availability") {
    const { data, error } = await db.rpc("hotel_staff_availability", { actor: user.id, stay_in: input.checkIn, stay_out: input.checkOut, party_guests: input.guests, reservation_id: input.reservationId ?? null });
    return error ? rpcFailure(error, reply) : reply({ data });
  }
  if (input.action === "staff-account") return staffAccount(input, deps);
  if (input.action.startsWith("staff-id-")) return staffPhoto(input, deps);
  if (input.action === "staff-balance-payment") return balancePayment(input, deps);
  if (input.action === "staff-invoice") return staffInvoice(input, deps);
  return reply({ error: "Unknown staff action." }, 400);
}

async function staffAccount(input: StaffInput, { db, user, reply }: StaffDependencies) {
  const change = asObject(input.change);
  if (change.action === "deactivate") {
    const { data, error } = await db.rpc("hotel_staff_account_change", { actor: user.id, change: { action: "staff_deactivate", userId: change.userId } });
    return error ? rpcFailure(error, reply) : reply({ data });
  }
  const password = typeof change.password === "string" ? change.password : "";
  if (password.length < 12 || password.length > 128) return reply({ error: "Use a password of 12 to 128 characters." }, 400);
  if (change.action === "reset") {
    if (typeof change.userId !== "string" || !uuid.test(change.userId)) return reply({ error: "Choose a staff account." }, 400);
    const { data: target } = await db.from("hotel_staff").select("user_id").eq("user_id", change.userId).eq("active", true).maybeSingle();
    if (!target) return reply({ error: "Active staff account not found." }, 404);
    const { data: currentRole, error: roleError } = await db.rpc("hotel_staff_role", { actor: user.id });
    if (roleError) return rpcFailure(roleError, reply);
    if (currentRole !== "manager") return reply({ error: "Active manager access required." }, 403);
    const { error } = await db.auth.admin.updateUserById(target.user_id, { password });
    if (error) return reply({ error: "Password could not be reset." }, 503);
    const { data, error: auditError } = await db.rpc("hotel_staff_account_change", { actor: user.id, change: { action: "staff_password_audit", userId: target.user_id } });
    return auditError ? rpcFailure(auditError, reply) : reply({ data });
  }
  const username = typeof change.username === "string" ? change.username.trim().toLowerCase() : "";
  const name = typeof change.name === "string" ? change.name.trim() : "";
  if (change.action !== "create" || !/^[a-z][a-z0-9_.-]{2,39}$/.test(username) || username === "admin" || name.length < 2 || name.length > 120 || !isStaffRole(change.role)) return reply({ error: "Supply a name, unique username and approved role." }, 400);
  const { data: existing, error: lookupError } = await db.from("hotel_staff").select("user_id").eq("username", username).maybeSingle();
  if (lookupError) return reply({ error: "Staff accounts are unavailable." }, 503);
  if (existing) return reply({ error: "That username is already in use." }, 409);
  const { data: currentRole, error: roleError } = await db.rpc("hotel_staff_role", { actor: user.id });
  if (roleError) return rpcFailure(roleError, reply);
  if (currentRole !== "manager") return reply({ error: "Active manager access required." }, 403);
  // This internal Auth identifier is never presented as a guest email or emailed.
  const authEmail = `${crypto.randomUUID()}@staff.mainali.invalid`;
  const { data: auth, error: createError } = await db.auth.admin.createUser({ email: authEmail, password, email_confirm: true, user_metadata: { full_name: name } });
  if (createError || !auth.user) return reply({ error: "Staff account could not be created." }, 503);
  const { data, error } = await db.rpc("hotel_staff_account_change", { actor: user.id, change: { action: "staff_save", userId: auth.user.id, name, username, role: change.role, authEmail } });
  if (error) {
    // Auth and SQL are separate transactions: remove only the new unlinked account on failure.
    await db.auth.admin.deleteUser(auth.user.id);
    return rpcFailure(error, reply);
  }
  return reply({ data });
}

async function staffPhoto(input: StaffInput, { db, user, reply }: StaffDependencies) {
  if (typeof input.reservationId !== "string" || !uuid.test(input.reservationId)) return reply({ error: "Choose a stay." }, 400);
  const { data: authorization, error } = await db.rpc("hotel_id_photo_authorize", { actor: user.id, reservation_id: input.reservationId });
  if (error) return rpcFailure(error, reply);
  const bucket = db.storage.from(photoBucket);
  if (input.action === "staff-id-upload") {
    const ext = typeof input.contentType === "string" ? photoTypes[input.contentType] : null;
    if (!ext || !Number.isInteger(input.size) || Number(input.size) <= 0 || Number(input.size) > photoLimit || !["front", "back"].includes(String(input.side))) return reply({ error: "Choose a JPG, PNG or WebP photo no larger than 5 MB." }, 400);
    const path = `${input.reservationId}/${user.id}/${crypto.randomUUID()}.${input.side}.${ext}`;
    const { data, error: uploadError } = await bucket.createSignedUploadUrl(path, { upsert: false });
    return uploadError ? reply({ error: "Photo upload unavailable." }, 503) : reply({ data });
  }
  if (!validPhotoPath(input.path, input.reservationId, input.action === "staff-id-register" ? input.side : undefined)) return reply({ error: "Invalid photo path." }, 400);
  if (input.action === "staff-id-register") {
    if (input.path.split("/")[1] !== user.id || !["front", "back"].includes(String(input.side))) return reply({ error: "Photo upload does not belong to this session." }, 403);
    const { data: info, error: infoError } = await bucket.info(input.path);
    const metadata = asObject(info?.metadata);
    const mime = metadata.mimetype ?? metadata.mimeType ?? asObject(info).contentType;
    const size = metadata.size ?? asObject(info).size;
    if (infoError || typeof mime !== "string" || !photoTypes[mime] || !Number.isSafeInteger(Number(size)) || Number(size) <= 0 || Number(size) > photoLimit || !input.path.endsWith(`.${photoTypes[mime]}`)) return reply({ error: "The uploaded photo is invalid or too large." }, 400);
    const { data, error: saveError } = await db.rpc("hotel_staff_change", { actor: user.id, change: { action: "id_photo", reservationId: input.reservationId, path: input.path, side: input.side } });
    return saveError ? rpcFailure(saveError, reply) : reply({ data });
  }
  if (!Array.isArray(authorization?.paths) || !authorization.paths.includes(input.path)) return reply({ error: "Photo not found for this stay." }, 404);
  const { data, error: readError } = await bucket.createSignedUrl(input.path, 60);
  return readError ? reply({ error: "Photo unavailable." }, 503) : reply({ data });
}

function testPaymentsReady(env: StaffDependencies["env"]) {
  return (env("RAZORPAY_MODE") ?? "test") === "test" && !!env("RAZORPAY_KEY_ID")?.startsWith("rzp_test_") && !!env("RAZORPAY_KEY_SECRET") && !!env("RAZORPAY_WEBHOOK_SECRET");
}
function safeProviderUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return url.protocol === "https:" && ["rzp.io", "razorpay.com", "api.razorpay.com"].includes(url.hostname) ? value : null; } catch { return null; }
}
async function balancePayment(input: StaffInput, deps: StaffDependencies) {
  const { db, user, reply } = deps;
  if (!testPaymentsReady(deps.env)) return reply({ error: "Test payment keys and webhook setup are required. Live balance payments are not enabled." }, 503);
  if (!["link", "qr"].includes(String(input.kind)) || typeof input.requestId !== "string" || !uuid.test(input.requestId)) return reply({ error: "Choose a payment method." }, 400);
  const { data: request, error } = await db.rpc("hotel_staff_balance_request", { actor: user.id, reservation_id: input.reservationId, payment_kind: input.kind === "qr" ? "upi_qr" : "payment_link", request_key: input.requestId });
  if (error) return rpcFailure(error, reply);
  if (request.provider_id) return reply({ data: { ...asObject(request.details), requestId: request.id, amountPaise: request.amount_paise, mode: "test" } });
  if (!Number.isSafeInteger(Number(request.amount_paise)) || Number(request.amount_paise) <= 0) return reply({ error: "No payable balance." }, 409);
  const notes = { staff_balance_request: request.id };
  const body = input.kind === "qr" ? { type: "upi_qr", name: "Hotel Teesta balance", usage: "single_use", fixed_amount: true, payment_amount: Number(request.amount_paise), description: "Hotel stay balance", close_by: Math.floor(Date.now() / 1000) + 1800, notes } : { amount: Number(request.amount_paise), currency: "INR", accept_partial: false, reference_id: request.id, description: "Hotel stay balance", notify: { sms: false, email: false }, reminder_enable: false, expire_by: Math.floor(Date.now() / 1000) + 1800, notes };
  const entity = await deps.provider(input.kind === "qr" ? "payments/qr_codes" : "payment_links", { method: "POST", body: JSON.stringify(body) });
  const id = entity.id;
  const url = safeProviderUrl(input.kind === "qr" ? entity.image_url : entity.short_url);
  if (typeof id !== "string" || !new RegExp(input.kind === "qr" ? "^qr_[A-Za-z0-9]+$" : "^plink_[A-Za-z0-9]+$").test(id) || !url) return reply({ error: "Payment provider returned an invalid response." }, 503);
  const details = input.kind === "qr" ? { imageUrl: url, kind: "qr" } : { url, kind: "link" };
  const { data, error: saveError } = await db.rpc("hotel_staff_balance_attach", { actor: user.id, request_id: request.id, provider_id: id, details });
  if (saveError) {
    // Close an unattached provider request; a payment must never silently lose its stay mapping.
    await deps.provider(input.kind === "qr" ? `payments/qr_codes/${id}/close` : `payment_links/${id}/cancel`, { method: "POST" }).catch(() => null);
    return rpcFailure(saveError, reply);
  }
  return reply({ data: { ...asObject(data?.details ?? details), requestId: request.id, amountPaise: request.amount_paise, mode: "test" } });
}

async function staffInvoice(input: StaffInput, deps: StaffDependencies) {
  const { db, user, reply } = deps;
  if (!["create", "share", "revoke", "email"].includes(String(input.operation))) return reply({ error: "Unknown invoice action." }, 400);
  const { data: invoice, error } = await db.rpc("hotel_staff_change", { actor: user.id, change: { action: input.operation === "revoke" ? "invoice_revoke" : "invoice", reservationId: input.reservationId } });
  if (error) return rpcFailure(error, reply);
  if (input.operation === "create" || input.operation === "revoke") return reply({ data: invoice });
  if (input.operation === "email" && (!deps.env("RESEND_API_KEY") || !deps.env("RESEND_FROM_EMAIL"))) return reply({ error: "Email provider and verified sender are required." }, 503);
  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const { data: shared, error: shareError } = await db.rpc("hotel_staff_change", { actor: user.id, change: { action: "invoice_share", reservationId: input.reservationId, tokenHash: await sha256(token) } });
  if (shareError) return rpcFailure(shareError, reply);
  const url = `https://mainli-group-of-hotels.vercel.app/invoice/${token}`;
  if (input.operation === "email") {
    const { data: booking } = await db.from("hotel_reservations").select("email,reference").eq("id", input.reservationId).single();
    if (!booking?.email || booking.email.endsWith(".invalid")) return reply({ error: "A guest email address is required." }, 400);
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${deps.env("RESEND_API_KEY")}`, "Content-Type": "application/json", "Idempotency-Key": `mainali-invoice/${await sha256(token)}` }, body: JSON.stringify({ from: deps.env("RESEND_FROM_EMAIL"), to: [booking.email], subject: `Hotel Teesta invoice · ${booking.reference}`, text: `Your Hotel Teesta invoice is available at ${url}\n\nMainali Hospitality` }), signal: AbortSignal.timeout(10000) });
    if (!response.ok) return reply({ error: "The invoice email could not be delivered. Retry from the stay page." }, 503);
  }
  return reply({ data: { ...asObject(shared), url, token, emailSent: input.operation === "email" } });
}

// Called only after the caller has verified Razorpay's raw-body webhook signature.
export async function recordBalanceWebhook(event: Record<string, unknown>, deps: Pick<StaffDependencies, "db" | "provider" | "env">) {
  const kind = event.event === "payment_link.paid" ? "link" : event.event === "qr_code.credited" ? "qr" : null;
  if (!kind) return false;
  if (!testPaymentsReady(deps.env)) throw new Error("payment_setup");
  const payload = asObject(event.payload);
  const providerEntity = asObject(asObject(payload[kind === "link" ? "payment_link" : "qr_code"]).entity);
  const paymentEntity = asObject(asObject(payload.payment).entity);
  if (typeof providerEntity.id !== "string" || !new RegExp(kind === "link" ? "^plink_[A-Za-z0-9]+$" : "^qr_[A-Za-z0-9]+$").test(providerEntity.id) || typeof paymentEntity.id !== "string" || !/^pay_[A-Za-z0-9]+$/.test(paymentEntity.id)) throw new Error("payment_mismatch");
  const payment = await deps.provider(`payments/${paymentEntity.id}`);
  if (payment.status !== "captured" || payment.currency !== "INR" || !Number.isSafeInteger(payment.amount) || Number(payment.amount) <= 0 || Number(payment.amount_refunded ?? 0) !== 0) throw new Error("payment_pending");
  if (kind === "link") {
    const link = await deps.provider(`payment_links/${providerEntity.id}`);
    if (link.currency !== "INR" || link.status !== "paid" || link.amount !== payment.amount || link.order_id !== payment.order_id || !payment.order_id) throw new Error("payment_mismatch");
  } else {
    const payments = await deps.provider(`payments/qr_codes/${providerEntity.id}/payments?count=100`);
    if (!Array.isArray(payments.items) || !payments.items.some(p => asObject(p).id === paymentEntity.id)) throw new Error("payment_mismatch");
  }
  const { error } = await deps.db.rpc("hotel_staff_record_balance_payment", { provider_request: providerEntity.id, payment_id: paymentEntity.id, amount: payment.amount });
  if (error) throw new Error("payment_mismatch");
  return true;
}
