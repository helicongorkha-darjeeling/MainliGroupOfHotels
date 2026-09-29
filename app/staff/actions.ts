"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionSupabaseClient } from "@/lib/server/supabase-session";

const housekeepingUpdateSchema = z.object({
  roomId: z.uuid(),
  status: z.enum(["unknown", "clean", "dirty", "inspecting", "out_of_service"]),
});

export async function updateHousekeeping(formData: FormData) {
  const parsed = housekeepingUpdateSchema.safeParse({
    roomId: formData.get("roomId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createSessionSupabaseClient();
  if (!supabase) redirect("/staff/login");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/staff/login");

  const { error } = await supabase.rpc("set_room_housekeeping_status", {
    target_room_id: parsed.data.roomId,
    next_status: parsed.data.status,
  });
  if (error) throw new Error("Housekeeping status could not be updated.");
  revalidatePath("/staff");
}

export async function signOutStaff() {
  const supabase = await createSessionSupabaseClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/staff/login");
}
