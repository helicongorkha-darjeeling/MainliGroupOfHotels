import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Brand } from "@/components/brand";
import { StaffInvoice } from "@/components/staff-invoice";
import { bookingGateway } from "@/lib/server/booking-gateway";
import type { PrintableInvoice } from "@/lib/staff-types";
export const metadata: Metadata = { title: "Guest invoice", robots: { index: false, follow: false, noarchive: true }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";
export default async function SharedInvoicePage({params}: {params: Promise<{token:string}>}) {
 const {token} = await params; if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) notFound();
 const result = await bookingGateway("invoice-public", {token}); if (result.error || !result.data) notFound();
 return <main className="staff-app staff-shared-invoice"><Brand/><StaffInvoice invoice={result.data as PrintableInvoice}/></main>;
}

