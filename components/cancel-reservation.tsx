"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function CancelReservation({reservationId}:{reservationId:string}){
  const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function cancel(){setBusy(true);setMessage("");try{const response=await fetch("/api/reservations/cancel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reservationId})});const result=await response.json();if(!response.ok)throw new Error(result.error??"Cancellation failed.");router.refresh();}catch(error){setMessage(error instanceof Error?error.message:"Retry shortly.");}finally{setBusy(false);}}
  return <div><button type="button" className="button button-outline" onClick={cancel} disabled={busy}>{busy?"Cancelling…":"Cancel unpaid hold"}</button><p role="status">{message}</p></div>;
}
