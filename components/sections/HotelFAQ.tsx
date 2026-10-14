import type { HotelFaq } from "@/lib/hotel-content";
import { buildFaqSchema, serializeJsonLd } from "@/lib/hotel-schema";
export function HotelFAQ({ faqs, pageUrl, title = "Good to know", id = "hotel-faq" }: { faqs: HotelFaq[]; pageUrl: string; title?: string; id?: string }) {
  if (!faqs.length) return null;
  return <section aria-labelledby={id} className="hotel-faq">
    <h2 id={id}>{title}</h2>
    <div className="mt-6 divide-y divide-[var(--mh-line)]">{faqs.map(faq => <details key={faq.question} className="py-4">
      <summary className="cursor-pointer list-none font-medium focus-visible:outline-2">{faq.question}<span aria-hidden="true">+</span></summary>
      <div className="pt-4"><p>{faq.answer}</p></div>
    </details>)}</div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildFaqSchema(faqs, pageUrl)) }} />
  </section>;
}

