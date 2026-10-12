export function BookingSteps({ step }: { step: 1 | 2 | 3 }) {
  return <ol className="booking-steps" aria-label="Booking progress">
    {["Review your stay", "Guest details", "Pay & confirm"].map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined} data-complete={step > index + 1}>
      <span aria-hidden="true">{index + 1}</span>{label}
    </li>)}
  </ol>;
}
