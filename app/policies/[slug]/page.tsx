import { siteMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const policies = {
  "booking-terms": {
    title: "Booking terms",
    intro: "Book now leads to Google sign-in, room review and secure payment. Payment terms and tax treatment remain subject to final hotel approval.",
    sections: [
      ["Rates and inclusions", "Standard nightly room charges are ₹2,000 for one guest, ₹2,500 for two guests, and ₹1,200 per guest for parties of three or more. Published seasonal rates may apply by stay night. Unconfirmed amenities, meals and extras are not promised. Applicable taxes are pending hotel confirmation; no GST percentage is assumed or collected by this reservation form."],
      ["Stay dates", "A stay is calculated in nights from check-in up to, but excluding, checkout. Approved arrival and departure times are still required."],
      ["Payment holds", "Proceeding to payment checks current availability and creates a 15-minute inventory hold. Its original deadline is shown during checkout and does not restart when you refresh. The rooms release if payment is not verified in time. Browsing and signing in do not hold inventory. Online payment remains unavailable until the hotel configures final taxes and payment setup."],
      ["Existing tentative reservations", "An existing unpaid tentative reservation retains its displayed 24-hour deadline in My bookings. The hold releases automatically unless payment is verified or the hotel explicitly confirms the stay after follow-up. New online checkout offers payment confirmation."],
      ["Confirmation", "A reservation is confirmed after the server verifies captured payment while its inventory hold remains valid, or after explicit front-desk confirmation. A payment captured after an expired hold requires hotel review; it is not automatic booking confirmation. Reception assigns physical room numbers after confirmation."],
      ["Updates and reminders", "The hotel uses reservation contact details for transactional updates, pre-arrival email reminders and front-desk follow-up. Automated emails start only after the hotel configures its verified sender. No marketing consent is inferred."],
    ],
  },
  refunds: {
    title: "Cancellation and refunds",
    intro: "The hotel has not yet supplied an approved cancellation or refund schedule.",
    sections: [
      ["Unpaid holds", "You may cancel an unpaid hold in My bookings, releasing its rooms. Unconfirmed holds expire at their original displayed deadline: 15 minutes for payment checkout, or 24 hours for an existing tentative reservation."],
      ["Paid reservations", "A paid cancellation/refund schedule is awaiting hotel approval. Online payment remains disabled until the final taxes and terms are configured. No non-refundable, free-cancellation or refund-timing promise is made here."],
      ["Refunds", "A refund and a reservation cancellation will be recorded as related but separate actions. Processing times must be confirmed with the owner and payment provider."],
      ["No-show and date changes", "Rules for no-shows, early departure and date changes remain pending owner approval."],
    ],
  },
  privacy: {
    title: "Privacy notice",
    intro: "This operational draft describes the planned minimum data handling for the booking service.",
    sections: [
      ["Information used", "When you proceed to payment, your name, phone, email, room category, guest count and stay dates are saved with your reservation and account. A 15-minute room hold is separate from payment confirmation. Contact details are used for this reservation and hotel follow-up, not as consent for marketing."],
      ["Email updates", "After email delivery is configured, transactional reservation messages are delivered using Resend. The email provider receives the recipient address and reservation information needed for the message. Staff may use your supplied phone number for stay-related follow-up."],
      ["Guest sign-in", "When you continue with Google, our sign-in provider, Supabase Auth, receives and stores your Google account name, email address and profile picture link so you can return to your guest account. When you save your guest details before payment, your entered name and contact phone number are also saved to your account for booking contact. We never see your Google password. Signing in or saving contact details does not verify your mobile number, create a reservation or take payment. You can ask the hotel to delete your guest account."],
      ["Before payment", "Checkout drafts are unverified and are not publicly readable. No identity document or card details are requested at this step. Draft expiry is separate from deletion; the owner must approve the retention and deletion schedule before live booking opens."],
      ["Hotel check-in", "At hotel check-in, authorised front desk staff record your address, nationality, party details, booking source and identification details, including private front and back ID photographs. Foreign guests may also need passport and visa details for hotel registration. These records are separate from online checkout. Aadhaar numbers are displayed using only the last four digits."],
      ["Access", "Guests see only their own booking records. Managers and front desk staff can access guest registration records and private ID photographs for hotel operations. Housekeeping staff see room and cleaning status only, without guest contact, identification or payment information. Important staff changes are audited."],
      ["Invoice sharing", "When authorised staff share an invoice, its recipient can open an expiring link without signing in. The invoice contains the guest name, address, stay and bill, but no ID photographs, passport or visa details. Staff can revoke the link. Sharing through WhatsApp opens a message for the sender to review; sending is their choice."],
      ["Data minimisation and retention", "Personal information is excluded from routine booking-flow logs and analytics. The owner must approve retention and deletion periods for reservations, hotel registration records, private ID photographs and invoices before the staff registration service is activated. Hold expiry does not automatically delete these records."],
    ],
  },
} as const;

export function generateStaticParams() {
  return Object.keys(policies).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const policy = policies[slug as keyof typeof policies];
  return policy ? siteMetadata("/policies/" + slug, policy.title, policy.intro) : {};
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = policies[slug as keyof typeof policies];
  if (!policy) notFound();

  return (
    <main className="mainali-public-page">
      <SiteHeader />
      <article className="policy-page site-shell">
        <p className="eyebrow">Guest information</p>
        <h1>{policy.title}</h1>
        <div className="draft-warning"><AlertTriangle size={19} /><strong>Final taxes, arrival times and paid cancellation terms await hotel approval.</strong></div>
        <p className="lead">{policy.intro}</p>
        {policy.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}
        <Link href="/" className="text-link">Return home</Link>
      </article>
      <SiteFooter />
    </main>
  );
}
