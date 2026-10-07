import type { SupabaseClient, User } from "@supabase/supabase-js";
import { normaliseGuestPhone } from "./guest-details";

type MobileAuth = Pick<SupabaseClient["auth"], "signInWithOtp" | "updateUser" | "verifyOtp" | "getUser">;

// "sign_in" starts a phone session. "link" adds the mobile to the guest's current account
// (for example a Google sign-in) so verifying it doesn't replace that session with a new user.
export type MobileOtpMode = "sign_in" | "link";

export class MobileCheckoutError extends Error {}

// Contact metadata and an email session are not proof that this mobile is verified.
export function matchesVerifiedMobile(user: Pick<User, "phone" | "phone_confirmed_at"> | null, phone: string) {
  const normalised = normaliseGuestPhone(phone);
  const authPhone = user?.phone ? normaliseGuestPhone(user.phone.startsWith("+") ? user.phone : `+${user.phone}`) : null;
  return !!normalised && !!user?.phone_confirmed_at && Number.isFinite(Date.parse(user.phone_confirmed_at))
    && authPhone === normalised;
}

function configuredPhone(phone: string, enabled: boolean) {
  if (!enabled) throw new MobileCheckoutError("Mobile verification is not available yet. No SMS has been requested.");
  const normalised = normaliseGuestPhone(phone);
  if (!normalised) throw new MobileCheckoutError("Enter a valid mobile number with its country code.");
  return normalised;
}

export async function requestMobileOtp(auth: MobileAuth, phone: string, captchaToken: string, enabled: boolean, mode: MobileOtpMode = "sign_in") {
  const normalised = configuredPhone(phone, enabled);
  if (!captchaToken.trim()) throw new MobileCheckoutError("Complete the security check before requesting a code.");
  try {
    const { error } = mode === "link"
      ? await auth.updateUser({ phone: normalised })
      : await auth.signInWithOtp({
        phone: normalised,
        options: { channel: "sms", shouldCreateUser: true, captchaToken },
      });
    if (error) throw new MobileCheckoutError(error.status === 429
      ? "Please wait before requesting another code."
      : mode === "link" && error.code === "phone_exists"
        ? "This mobile is already linked to another guest account. Sign out and continue with your mobile, or use a different number."
        : "We couldn't request your SMS code. Check the number and try again shortly.");
    return normalised;
  } catch (error) {
    if (error instanceof MobileCheckoutError) throw error;
    throw new MobileCheckoutError("Unable to reach mobile verification. Check your connection and retry.");
  }
}

export async function verifyMobileOtp(auth: MobileAuth, phone: string, code: string, enabled: boolean, mode: MobileOtpMode = "sign_in") {
  const normalised = configuredPhone(phone, enabled);
  const token = code.trim();
  if (!/^\d{6}$/.test(token)) throw new MobileCheckoutError("Enter the six-digit code from your SMS.");
  try {
    const { data, error } = await auth.verifyOtp({ phone: normalised, token, type: mode === "link" ? "phone_change" : "sms" });
    if (error || !data.session) throw new MobileCheckoutError("That code couldn't be verified. Retry or request a new code.");
    // Ask Supabase Auth for the current user, rather than trusting browser metadata.
    const current = await auth.getUser();
    if (current.error || !matchesVerifiedMobile(current.data.user, normalised)) {
      throw new MobileCheckoutError("Mobile verification couldn't be confirmed. Please retry before continuing.");
    }
    return normalised;
  } catch (error) {
    if (error instanceof MobileCheckoutError) throw error;
    throw new MobileCheckoutError("Unable to verify your code. Check your connection and retry.");
  }
}
