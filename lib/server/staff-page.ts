import "server-only";
import { redirect } from "next/navigation";
import { readStaffAccess } from "./staff-access";
import { staffHome, type StaffRole } from "@/lib/staff-types";
export async function staffPageAccess(roles: readonly StaffRole[]) {
  const access = await readStaffAccess();
  if (!access.user || access.errorCode === "PT401") redirect("/staff/login");
  if (access.data && !roles.includes(access.data.role)) redirect(staffHome(access.data.role));
  return access;
}
