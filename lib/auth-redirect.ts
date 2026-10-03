const guestDestinations = new Set(["/book", "/my-bookings", "/members"]);

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

export function authCallbackUrl(origin: string, destination: string) {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", safeAuthDestination(destination, origin));
  return callback.toString();
}
