import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { HotelOperations } from "@/components/hotel-operations";
import { GoogleAuth } from "@/components/google-auth";
import { readStaffAccess } from "@/lib/server/staff-access";
import { redirect } from "next/navigation";
export const metadata:Metadata={title:"Admin dashboard",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function OperationsPage() {
  const access=await readStaffAccess();
  if(!access.user)redirect("/admin/login");
  return <main className="site-shell section-space admin-dashboard"><Brand/><p className="eyebrow">Hotel Teesta · Staff only</p><h1>Admin dashboard</h1>
    <div className="admin-toolbar"><Link href="/" className="text-link">Hotel website</Link>{access.data?.role==="manager"&&<Link href="/admin/security" className="text-link">Account &amp; password</Link>}<GoogleAuth signedIn destination="/admin/login"/></div>
    {access.error?<p className="preview-alert" role="alert">{access.error}</p>:access.data?<HotelOperations data={access.data}/>:null}
  </main>;
}
