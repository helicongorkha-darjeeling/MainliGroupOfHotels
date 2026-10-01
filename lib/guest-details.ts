import { z } from "zod";

export function normaliseGuestPhone(value: string): string | null {
  if (!/^[+\d\s().-]+$/.test(value)) return null;
  let phone = value.replace(/[\s().-]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (/^[6-9]\d{9}$/.test(phone)) phone = `+91${phone}`;
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

export const guestDetailsSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120, "Your name is too long."),
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address."),
  phone: z.string().trim().transform((value, context) => {
    const phone = normaliseGuestPhone(value);
    if (!phone) {
      context.addIssue({ code: "custom", message: "Enter a 10-digit Indian mobile number or an international number with its country code." });
      return z.NEVER;
    }
    return phone;
  }),
});
