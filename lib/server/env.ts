import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SECRET_KEY: z.string().min(20),
  RAZORPAY_KEY_ID: z.string().min(5),
  RAZORPAY_KEY_SECRET: z.string().min(8),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(8),
  BOOKING_MODE: z.enum(["preview", "live"]).default("preview"),
  CRON_SECRET: z.string().min(24),
  APP_RELEASE: z.string().min(1).optional(),
});

const publicSupabaseEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

// Contact capture must not depend on payment or scheduler credentials.
const checkoutEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(20),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;
export type PublicSupabaseEnvironment = z.infer<typeof publicSupabaseEnvironmentSchema>;

function rawEnvironment() {
  return {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    BOOKING_MODE: process.env.BOOKING_MODE,
    CRON_SECRET: process.env.CRON_SECRET,
    APP_RELEASE: process.env.APP_RELEASE,
  };
}

export function readServerEnvironment() {
  return serverEnvironmentSchema.safeParse(rawEnvironment());
}

export function readPublicSupabaseEnvironment() {
  return publicSupabaseEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function readCheckoutEnvironment() {
  return checkoutEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
}

export function requireServerEnvironment(): ServerEnvironment {
  const parsed = readServerEnvironment();
  if (!parsed.success) {
    throw new Error("Server configuration is incomplete. Check the deployment environment variables.");
  }
  return parsed.data;
}

export function missingEnvironmentKeys() {
  const parsed = readServerEnvironment();
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) => issue.path.join(".")).filter(Boolean).sort();
}
