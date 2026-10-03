"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Circle, Globe2, LockKeyhole } from "lucide-react";
import { Brand } from "@/components/brand";
import type { summariseInventory } from "@/lib/channel-manager";
import { formatInr } from "@/lib/rates";

type Inventory = ReturnType<typeof summariseInventory>;
const tabs = ["Overview", "Room mapping", "Launch checklist"] as const;
const launchChecks = [
  {done:true,label:"Owner's room inventory recorded",detail:"25 rooms · 70-person capacity; not yet live availability"},
  {done:true,label:"Private checkout-draft capture verified",detail:"Contact details saved before payment; not a reservation"},
  {done:true,label:"Double Room price unified",detail:"Same starting room rate for one or two guests"},
  {done:false,label:"Publish verified room categories",detail:"Confirm the six-person photo mapping and unpriced layouts"},
  {done:false,label:"Activate category-level inventory reservations",detail:"Atomic holds, expiry and reception assignment must be tested"},
  {done:false,label:"Verify identity and payment providers",detail:"Real OTP, server-verified payment and confirmed booking records"},
];

export function ChannelWorkspace({ inventory, preview }: {inventory:Inventory;preview:boolean}) {
  const [tab,setTab]=useState<(typeof tabs)[number]>("Overview");
  return <main className="channel-workspace"><header className="channel-header"><Brand /><span>Hotel Teesta · Operations</span><Link href="/staff">Front desk <ArrowUpRight size={15} /></Link></header><div className="channel-title"><p className="eyebrow">Website first</p><h1>One hotel.<br />One inventory source.</h1><p>Direct-channel setup workspace. {preview ? "Local read-only preview of the owner's source inventory." : "Read-only setup view for authorised hotel staff."} No live availability, room holds or OTA sync are claimed.</p></div><nav className="channel-tabs" aria-label="Channel workspace sections">{tabs.map(label=><button key={label} type="button" aria-pressed={tab===label} onClick={()=>setTab(label)}>{label}</button>)}</nav>
    {tab==="Overview" ? <section><div className="channel-metrics"><div><span>Source rooms</span><strong>{inventory.rooms}</strong></div><div><span>Source guest capacity</span><strong>{inventory.capacity}</strong></div><div><span>Inventory categories</span><strong>{inventory.categories.length}</strong></div><div><span>Live channels</span><strong>Not activated</strong></div></div><div className="direct-channel-panel"><Globe2 size={32} strokeWidth={1.3} /><div><p className="eyebrow">Your website · First channel</p><h2>Mainali direct</h2><p>The guest journey is connected to private checkout drafts. Inventory publication, reservation holds and payments remain gated.</p><Link href="/stays/teesta" className="button button-outline">Open guest website</Link></div><span className="channel-status">Setup in progress</span></div><div className="channel-next"><LockKeyhole size={20} /><p>OTA connections come later. One category inventory pool must safely serve the direct website before any other channel is enabled.</p></div></section> : tab==="Room mapping" ? <section className="channel-mapping"><h2>Map the room, not its number.</h2><p>Reception retains physical room assignment. These are owner-source counts, not an availability calendar.</p><div className="channel-table-wrap"><table><caption>Hotel Teesta room-category mapping</caption><thead><tr><th>Inventory category</th><th>Rooms</th><th>Capacity / room</th><th>Starting rate</th><th>Mapping gate</th></tr></thead><tbody>{inventory.categories.map(category=><tr key={category.inventoryId}><th>{category.title}</th><td>{category.rooms}</td><td>{category.capacity}</td><td>{category.ratePaise ? formatInr(category.ratePaise)+"+" : "On request"}</td><td>{category.mapping}</td></tr>)}</tbody></table></div><p className="fine-print">No room numbers, credentials, guest details or fabricated sales are exposed here.</p></section> : <section className="channel-checklist"><h2>Before direct booking goes live.</h2>{launchChecks.map(check=><div key={check.label}>{check.done ? <CheckCircle2 size={22} /> : <Circle size={22} />}<div><strong>{check.label}</strong><p>{check.detail}</p></div><span>{check.done ? "Verified locally" : "Pending"}</span></div>)}</section>}
  </main>;
}
