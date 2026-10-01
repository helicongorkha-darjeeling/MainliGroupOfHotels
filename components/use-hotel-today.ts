"use client";

import { useSyncExternalStore } from "react";
import { hotelToday } from "@/lib/stay";

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  window.addEventListener("focus", onChange);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", onChange);
  };
}

// Static pages must not freeze "today" at deployment time or mismatch hydration.
export function useHotelToday() {
  return useSyncExternalStore(subscribe, hotelToday, () => "");
}
