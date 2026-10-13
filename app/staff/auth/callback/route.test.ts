import { describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/supabase-session", () => ({ createSessionSupabaseClient: session }));
import { GET } from "./route";

describe("retired staff OAuth callback", () => {
  it("sends old OAuth links to password sign-in without exchanging a code", async () => {
    const response = await GET(new Request("https://mainli-group-of-hotels.vercel.app/staff/auth/callback?code=old-code"));
    expect(response.headers.get("location")).toBe("https://mainli-group-of-hotels.vercel.app/staff/login");
    expect(session).not.toHaveBeenCalled();
  });
});
