import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const policies = {
  "booking-terms": {
    title: "Booking terms",
    intro: "This draft identifies the terms the owner must approve before online booking can open.",
    sections: [
      ["Rates and inclusions", "Confirmed room rate, taxes, inclusions, extra-person charges and the amount payable now will be shown before phone verification."],
      ["Stay dates", "A stay is calculated in nights from check-in up to, but excluding, checkout. Approved arrival and departure times are still required."],
      ["Confirmation", "A reservation will be confirmed only after the server verifies the required payment and inventory is still available."],
    ],
  },
  refunds: {
    title: "Cancellation and refunds",
    intro: "The hotel has not yet supplied an approved cancellation or refund schedule.",
    sections: [
      ["Cancellation", "The applicable cancellation terms will be shown with the price before the guest pays."],
      ["Refunds", "A refund and a reservation cancellation will be recorded as related but separate actions. Processing times must be confirmed with the owner and payment provider."],
      ["No-show and date changes", "Rules for no-shows, early departure and date changes remain pending owner approval."],
    ],
  },
  privacy: {
    title: "Privacy notice",
    intro: "This operational draft describes the planned minimum data handling for the booking service.",
    sections: [
      ["Information used", "Phone number, email, stay details, booking records and payment status will be used to operate a reservation. Guest name and required arrival details will be collected after booking."],
      ["Access", "Guests will see only their own records. Staff access will be limited to assigned properties and authorised duties, with important changes audited."],
      ["Data minimisation", "The initial release will not request ID uploads. Personal information will be excluded from routine logs and booking-flow analytics."],
    ],
  },
} as const;

export function generateStaticParams() {
  return Object.keys(policies).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const policy = policies[slug as keyof typeof policies];
  return policy ? { title: policy.title } : {};
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = policies[slug as keyof typeof policies];
  if (!policy) notFound();

  return (
    <main>
      <SiteHeader />
      <article className="policy-page site-shell">
        <p className="eyebrow">Guest information</p>
        <h1>{policy.title}</h1>
        <div className="draft-warning"><AlertTriangle size={19} /><strong>Draft — owner and legal review required before publication.</strong></div>
        <p className="lead">{policy.intro}</p>
        {policy.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}
        <Link href="/" className="text-link">Return home</Link>
      </article>
      <SiteFooter />
    </main>
  );
}
