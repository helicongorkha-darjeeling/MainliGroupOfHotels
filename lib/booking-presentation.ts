export function seasonalSavings(subtotalPaise: number, standardSubtotalPaise?: number) {
  return standardSubtotalPaise && standardSubtotalPaise > subtotalPaise
    ? standardSubtotalPaise - subtotalPaise : 0;
}

export function roomAvailability(availableRooms: number) {
  if (availableRooms <= 0) return "Sold out for these dates";
  const rooms = `${availableRooms} ${availableRooms === 1 ? "room" : "rooms"}`;
  return availableRooms <= 3 ? `Only ${rooms} left for these dates` : `${rooms} available for these dates`;
}

export function remainingHoldSeconds(holdUntil: string, now: number) {
  const deadline = Date.parse(holdUntil);
  return Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
}

export function formatHoldCountdown(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
