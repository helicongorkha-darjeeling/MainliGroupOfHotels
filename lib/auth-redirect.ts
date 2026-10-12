const guestDestinations = new Set(["/book", "/my-bookings", "/members"]);
export const authReturnCookieName = "mainali-auth-return";

/** Never accept an external host, staff route, backslash, or control character. */
export function safeAuthDestination(requested: string | null | undefined, origin: string) {
  const fallback = "/my-bookings";
  if (!requested || requested.length > 2048 || !requested.startsWith("/") || requested.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(requested)) return fallback;
  try {
    const target = new URL(requested, origin);
    if (target.origin !== new URL(origin).origin || !guestDestinations.has(target.pathname)) return fallback;
    return target.pathname + target.search;
  } catch {
    return fallback;
  }
}

export function authCallbackUrl(origin: string) {
  return new URL("/auth/callback", origin).toString();
}

/** A fixed OAuth callback can be allowed exactly, while this short-lived cookie preserves the stay. */
export function authReturnCookie(origin: string, destination: string) {
  const value = encodeURIComponent(safeAuthDestination(destination, origin));
  return `${authReturnCookieName}=${value}; Path=/auth/callback; Max-Age=600; SameSite=Lax${new URL(origin).protocol === "https:" ? "; Secure" : ""}`;
}

export function authReturnDestination(value: string | undefined, origin: string) {
  try {
    return safeAuthDestination(value ? decodeURIComponent(value) : undefined, origin);
  } catch {
    return "/my-bookings";
  }
}
