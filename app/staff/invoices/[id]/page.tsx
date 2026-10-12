import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaffInvoice } from "@/components/staff-invoice";
import { StaffShell } from "@/components/staff-shell";
import { staffPageAccess } from "@/lib/server/staff-page";
export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";
export default async function InvoicePage({params}: {params: Promise<{id:string}>}) {
 const {id} = await params; const access = await staffPageAccess(["manager", "reception"]);
 if (!access.data || access.data.role === "housekeeping") return <StaffShell title="Invoice"><p role="alert">{access.error}</p></StaffShell>;
 const invoice = access.data.invoices?.find(item => item.reservation_id === id || item.id === id); if (!invoice) notFound();
 return <StaffShell title="Invoice" role={access.data.role}><StaffInvoice invoice={invoice}/></StaffShell>;
}

