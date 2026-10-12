import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { HotelOperations,type HotelOperationsData } from "@/components/hotel-operations";
import { bookingGateway } from "@/lib/server/booking-gateway";
import { signedInGuest } from "@/lib/server/booking-http";
export const metadata:Metadata={title:"Hotel operations",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function OperationsPage() {
  const user=await signedInGuest();
  const result=user?await bookingGateway("staff"):null;
  return <main className="site-shell section-space"><Brand/><p className="eyebrow">Hotel Teesta · Staff only</p><h1>Hotel operations</h1>
    {!user?<><p>Sign in, then return to this page. Your account must have an assigned hotel role.</p><Link href="/members" className="button button-primary">Sign in with Google</Link></>:result?.error?<p className="preview-alert">{result.error.message}</p>:<HotelOperations data={result?.data as HotelOperationsData}/>}
  </main>;
}
