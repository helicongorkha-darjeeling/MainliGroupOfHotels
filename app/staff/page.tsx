import { redirect } from "next/navigation";
import { readStaffRole } from "@/lib/server/staff-access";
import { staffHome } from "@/lib/staff-types";
import { StaffShell } from "@/components/staff-shell";
export const dynamic = "force-dynamic";
export default async function StaffHomePage() {
  const access = await readStaffRole();
  if (!access.user || access.status === 401) redirect("/staff/login");
  if (access.role) redirect(staffHome(access.role));
  return <StaffShell title="Staff access"><p role="alert">{access.error ?? "Ask your manager to activate your staff account."}</p></StaffShell>;
}
