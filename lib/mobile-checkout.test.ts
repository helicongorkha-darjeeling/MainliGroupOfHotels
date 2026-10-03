import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { matchesVerifiedMobile, requestMobileOtp, verifyMobileOtp } from "./mobile-checkout";

const phone = "+919999999999";
const confirmed = { phone: "919999999999", phone_confirmed_at: "2026-10-02T00:00:00Z" };

function fixture() {
  const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
  const verifyOtp = vi.fn().mockResolvedValue({ data: { session: { user: confirmed } }, error: null });
  const getUser = vi.fn().mockResolvedValue({ data: { user: confirmed }, error: null });
  const auth = { signInWithOtp, verifyOtp, getUser } as unknown as SupabaseClient["auth"];
  return { auth, signInWithOtp, verifyOtp, getUser };
}

describe("mobile checkout integration seam", () => {
  it("requires a matching Auth mobile and confirmation timestamp, not contact metadata", () => {
    expect(matchesVerifiedMobile(confirmed, phone)).toBe(true);
    expect(matchesVerifiedMobile({ ...confirmed, phone }, "9999999999")).toBe(true);
    expect(matchesVerifiedMobile({ phone }, phone)).toBe(false);
    expect(matchesVerifiedMobile({ phone: undefined, phone_confirmed_at: confirmed.phone_confirmed_at }, phone)).toBe(false);
    expect(matchesVerifiedMobile({ ...confirmed, phone: "919888888888" }, phone)).toBe(false);
    expect(matchesVerifiedMobile({ ...confirmed, phone_confirmed_at: "invalid" }, phone)).toBe(false);
    expect(matchesVerifiedMobile(null, phone)).toBe(false);
  });

  it("does not request SMS while the integration is disabled", async () => {
    const f = fixture();
    await expect(requestMobileOtp(f.auth, phone, "captcha-fixture", false)).rejects.toThrow("not available");
    expect(f.signInWithOtp).not.toHaveBeenCalled();
  });

  it("requires a valid mobile and fresh CAPTCHA before requesting SMS", async () => {
    const f = fixture();
    await expect(requestMobileOtp(f.auth, "invalid", "captcha-fixture", true)).rejects.toThrow("valid mobile");
    await expect(requestMobileOtp(f.auth, phone, "  ", true)).rejects.toThrow("security check");
    expect(f.signInWithOtp).not.toHaveBeenCalled();
  });

  it("requests SMS OTP, not an email link, with CAPTCHA passed to Supabase", async () => {
    const f = fixture();
    await expect(requestMobileOtp(f.auth, "99999 99999", "captcha-fixture", true)).resolves.toBe(phone);
    expect(f.signInWithOtp).toHaveBeenCalledWith({ phone, options: { channel: "sms", shouldCreateUser: true, captchaToken: "captcha-fixture" } });
  });

  it("uses controlled quota/provider/network errors without claiming delivery", async () => {
    const f = fixture();
    f.signInWithOtp.mockResolvedValueOnce({ error: { status: 429, message: "private provider details" } });
    await expect(requestMobileOtp(f.auth, phone, "captcha-fixture", true)).rejects.toThrow("wait");
    f.signInWithOtp.mockResolvedValueOnce({ error: { status: 500, message: "private provider details" } });
    await expect(requestMobileOtp(f.auth, phone, "captcha-fixture", true)).rejects.toThrow("couldn't request");
    f.signInWithOtp.mockRejectedValueOnce(new Error("private network details"));
    await expect(requestMobileOtp(f.auth, phone, "captcha-fixture", true)).rejects.toThrow("Unable to reach");
  });

  it("never verifies a disabled integration or malformed code", async () => {
    const f = fixture();
    await expect(verifyMobileOtp(f.auth, phone, "123456", false)).rejects.toThrow("not available");
    for (const code of ["12345", "abcdef", "1234567"]) {
      await expect(verifyMobileOtp(f.auth, phone, code, true)).rejects.toThrow("six-digit");
    }
    expect(f.verifyOtp).not.toHaveBeenCalled();
  });

  it("verifies through Auth then checks the current server-confirmed mobile", async () => {
    const f = fixture();
    await expect(verifyMobileOtp(f.auth, phone, " 123456 ", true)).resolves.toBe(phone);
    expect(f.verifyOtp).toHaveBeenCalledWith({ phone, token: "123456", type: "sms" });
    expect(f.getUser).toHaveBeenCalledOnce();
  });

  it("blocks missing sessions, incorrect codes and wrong/unconfirmed mobiles", async () => {
    const f = fixture();
    f.verifyOtp.mockResolvedValueOnce({ data: { session: null }, error: null });
    await expect(verifyMobileOtp(f.auth, phone, "123456", true)).rejects.toThrow("couldn't be verified");
    f.verifyOtp.mockResolvedValueOnce({ data: { session: null }, error: { message: "private auth details" } });
    await expect(verifyMobileOtp(f.auth, phone, "123456", true)).rejects.toThrow("couldn't be verified");
    for (const user of [null, { phone }, { ...confirmed, phone: "919888888888" }]) {
      f.getUser.mockResolvedValueOnce({ data: { user }, error: null });
      await expect(verifyMobileOtp(f.auth, phone, "123456", true)).rejects.toThrow("couldn't be confirmed");
    }
  });

  it("does not advance when Auth's current-user check fails", async () => {
    const f = fixture();
    f.getUser.mockResolvedValueOnce({ data: { user: confirmed }, error: { message: "private auth details" } });
    await expect(verifyMobileOtp(f.auth, phone, "123456", true)).rejects.toThrow("couldn't be confirmed");
    f.verifyOtp.mockRejectedValueOnce(new Error("private network details"));
    await expect(verifyMobileOtp(f.auth, phone, "123456", true)).rejects.toThrow("Unable to verify");
  });
});
