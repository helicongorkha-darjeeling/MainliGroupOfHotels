import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChannelWorkspace } from "@/components/channel-workspace";
import { summariseInventory } from "@/lib/channel-manager";
import { createSessionSupabaseClient } from "@/lib/server/supabase-session";
import source from "@/supabase/data/teesta-inventory.json";

export const metadata:Metadata={title:"Direct channel workspace",robots:{index:false,follow:false}};
export default async function ChannelsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  // Never enable this local planning preview in a production deployment.
  const preview=process.env.NODE_ENV==="development" && params.preview==="1";
  if (!preview) {
    const supabase=await createSessionSupabaseClient();
    if(!supabase) redirect("/staff/login");
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) redirect("/staff/login");
    const [memberships, property] = await Promise.all([
      supabase.from("staff_memberships").select("role, property_id").eq("user_id",user.id).eq("is_active",true),
      supabase.from("properties").select("id").eq("slug","hotel-teesta").maybeSingle(),
    ]);
    const authorised = !memberships.error && memberships.data?.some(membership =>
      (membership.role === "group_admin" && membership.property_id === null) ||
      (!property.error && !!property.data && membership.property_id === property.data.id &&
        (membership.role === "property_manager" || membership.role === "reception")),
    );
    if(!authorised) redirect("/staff");
  }
  return <ChannelWorkspace inventory={summariseInventory(source.rooms)} preview={preview} />;
}
