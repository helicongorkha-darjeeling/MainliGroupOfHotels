"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserRound, KeyRound } from "lucide-react";
import type { HotelOperationsData, StaffMember } from "@/lib/staff-types";
import { useStaffRequest, StaffNotice, StaffStatus } from "./staff-ui";

const roles = [{ value: "reception", label: "Front desk" }, { value: "housekeeping", label: "Housekeeping" }, { value: "manager", label: "Manager" }];

export function StaffAccounts({ data }: { data: HotelOperationsData }) {
  const router = useRouter();
  const request = useStaffRequest();
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [notice, setNotice] = useState({ text: "", error: false });
  if (data.role !== "manager") return <StaffNotice error>Manager access is required to manage staff.</StaffNotice>;
  async function save(input: Record<string, unknown>, form?: HTMLFormElement) {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true); setNotice({ text: "", error: false });
    try {
      await request("/api/staff/accounts", input);
      form?.reset(); setSelected(null); setAdding(false);
      setNotice({ text: "Staff account saved.", error: false }); router.refresh();
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not save this account.", error: true }); }
    finally { submitting.current = false; setPending(false); }
  }
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, fields = new FormData(form);
    void save({ action: "create", name: fields.get("name"), username: fields.get("username"), role: fields.get("role"), password: fields.get("password") }, form);
  }
  return <div className="staff-app staff-accounts">
    <div className="staff-title-row"><div><p className="staff-kicker">Manager only</p><h2>Team access</h2></div><UserRound size={28} aria-hidden="true" /></div>
    <p className="staff-lead">Give each person their own username. Housekeeping staff can sign in without a Google account.</p>
    <StaffNotice error={notice.error}>{notice.text}</StaffNotice>
    <button type="button" className="staff-primary" disabled={!data.staffCoreReady || pending} onClick={() => { setAdding(!adding); setSelected(null); }}><Plus size={20} aria-hidden="true" /> Add staff member</button>
    {!data.staffCoreReady && <StaffNotice>The staff update must be installed before new accounts can be added.</StaffNotice>}
    {adding && <form className="staff-form staff-card" onSubmit={create}>
      <h2>Add staff member</h2>
      <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={120} /></label>
      <label>Username<input name="username" autoComplete="off" autoCapitalize="none" required minLength={3} maxLength={32} pattern="[A-Za-z][A-Za-z0-9_.-]{2,31}" /><span className="staff-help">Start with a letter. Use letters, numbers, dots, dashes or underscores.</span></label>
      <label>Role<select name="role" defaultValue="reception">{roles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
      <label>Temporary password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /><span className="staff-help">At least 12 characters. Give it privately to this staff member.</span></label>
      <div className="staff-form-actions"><button disabled={pending} className="staff-primary">{pending ? "Saving…" : "Create staff account"}</button><button type="button" disabled={pending} onClick={() => setAdding(false)}>Cancel</button></div>
    </form>}
    <div className="staff-account-list">{(data.staffMembers || []).map(member => <article className="staff-card" key={member.user_id}>
      <div className="staff-title-row"><h2>{member.name || "Staff member"}</h2><StaffStatus value={member.active ? "active" : "inactive"} /></div>
      <p>{member.username || "Google account"} · {roles.find(role => role.value === member.role)?.label || member.role}</p>
      {member.active && <button type="button" disabled={pending || !data.staffCoreReady} onClick={() => { setSelected(member); setAdding(false); }}><KeyRound size={18} aria-hidden="true" /> Manage access</button>}
      {selected?.user_id === member.user_id && <div className="staff-account-controls">
        <form className="staff-form" onSubmit={event => { event.preventDefault(); const form = event.currentTarget; void save({ action: "reset", userId: member.user_id, password: new FormData(form).get("password") }, form); }}>
          <label>New temporary password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
          <button disabled={pending} className="staff-primary">Reset password</button>
        </form>
        <details><summary>Deactivate this staff member</summary><p>They will lose staff access immediately. Existing bookings and audit records stay saved.</p><button type="button" className="staff-danger" disabled={pending} onClick={() => void save({ action: "deactivate", userId: member.user_id })}>Deactivate {member.name || member.username}</button></details>
        <button type="button" onClick={() => setSelected(null)} disabled={pending}>Close</button>
      </div>}
    </article>)}</div>
    {(data.staffMembers || []).length === 0 && <p>No staff records were returned. Refresh to load the active team.</p>}
  </div>;
}
