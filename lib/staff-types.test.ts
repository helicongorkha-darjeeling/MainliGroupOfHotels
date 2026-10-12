import { expect, it } from "vitest";
import { isStaffRole, staffHome } from "./staff-types";
it("routes roles to their own home and never treats a browser-provided admin name as a role", () => {
  expect(staffHome("manager")).toBe("/staff/operations");
  expect(staffHome("reception")).toBe("/staff/operations");
  expect(staffHome("housekeeping")).toBe("/staff/housekeeping");
  for (const role of ["Admin", "guest", "owner", undefined]) expect(isStaffRole(role)).toBe(false);
});
