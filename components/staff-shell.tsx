import Link from "next/link";
import { Brand } from "./brand";
import { GoogleAuth } from "./google-auth";
import type { StaffRole } from "@/lib/staff-types";
export function StaffShell({ title, role, children }: { title: string; role?: StaffRole; children: React.ReactNode }) {
  return <main className="staff-app staff-shell"><header className="staff-app-header staff-shell-header"><Brand /><p className="eyebrow">Hotel Teesta · Staff</p><h1>{title}</h1>
    <nav aria-label="Staff navigation" className="staff-top-nav"><Link href="/staff">Home</Link>{role === "manager" && <Link href="/staff/team">Staff</Link>}
      {role === "manager" && <Link href="/admin/security">Password</Link>}<GoogleAuth signedIn destination="/staff/login" /></nav>
  </header><div className="staff-shell-main">{children}</div></main>;
}
