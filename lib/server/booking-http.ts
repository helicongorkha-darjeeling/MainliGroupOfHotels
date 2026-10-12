import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createSessionSupabaseClient } from "./supabase-session";

export function bookingResponse(body:object,status=200) {
  return NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});
}
export function bookingOrigin(request:NextRequest) {
  const expected=`${request.nextUrl.protocol}//${request.headers.get("host")??request.nextUrl.host}`;
  return request.headers.get("origin")===expected && request.headers.get("sec-fetch-site")!=="cross-site";
}
export async function smallJson(request:Request) {
  if(request.headers.get("content-type")?.split(";")[0].trim()!=="application/json"||!request.body) throw new Error("Invalid JSON");
  const reader=request.body.getReader(); let size=0; const chunks:Uint8Array[]=[];
  try { while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();throw new Error("Too large");}chunks.push(value);} }
  finally {reader.releaseLock();}
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function signedInGuest() {
  const client=await createSessionSupabaseClient();
  if(!client)return null;
  const {data,error}=await client.auth.getUser();
  return error||!data.user||(!data.user.email_confirmed_at&&!data.user.phone_confirmed_at)?null:data.user;
}
