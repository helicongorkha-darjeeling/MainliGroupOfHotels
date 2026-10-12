import { beforeEach,describe,expect,it,vi } from "vitest";
import { NextRequest } from "next/server";
const mocks=vi.hoisted(()=>({guest:vi.fn(),gateway:vi.fn()}));
vi.mock("@/lib/server/booking-http",async()=>{
  const {NextResponse}=await import("next/server");
  return {signedInGuest:mocks.guest,bookingOrigin:(r:NextRequest)=>r.headers.get("origin")==="http://localhost:3000",smallJson:(r:NextRequest)=>r.json(),bookingResponse:(body:object,status=200)=>NextResponse.json(body,{status})};
});
vi.mock("@/lib/server/booking-gateway",()=>({bookingGateway:mocks.gateway}));
import { POST } from "./route";
import { addHotelDays,hotelToday } from "@/lib/stay";
const start=addHotelDays(hotelToday(),1);
const input={requestId:"82000000-0000-4000-8000-000000000001",category:"triple-room",checkIn:start,checkOut:addHotelDays(start,2),guests:3,kind:"tentative",fullName:"Test Guest",email:"test@example.com",phone:"9876543210"};
const request=(body:object=input,origin="http://localhost:3000")=>new NextRequest("http://localhost:3000/api/reservations",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();mocks.guest.mockResolvedValue({id:"83000000-0000-4000-8000-000000000001",email:"test@example.com",email_confirmed_at:"2026-10-01T00:00:00Z"});mocks.gateway.mockResolvedValue({data:{reference:"MH-TEST",status:"tentative"},error:null});});
describe("authenticated reservations",()=>{
  it("requires same-origin, signed-in requests",async()=>{expect((await POST(request(input,"https://untrusted.example"))).status).toBe(403);mocks.guest.mockResolvedValue(null);expect((await POST(request())).status).toBe(401);expect(mocks.gateway).not.toHaveBeenCalled();});
  it("uses server-verified identity and only approved input fields",async()=>{expect((await POST(request())).status).toBe(200);expect(mocks.gateway).toHaveBeenCalledWith("reserve",expect.objectContaining({args:expect.objectContaining({guest_user:"83000000-0000-4000-8000-000000000001",guest_phone:"+919876543210",party_guests:3})}));});
  it("rejects a contact email the signed-in guest does not own",async()=>{expect((await POST(request({...input,email:"other@example.com"}))).status).toBe(403);expect(mocks.gateway).not.toHaveBeenCalled();});
  it("rejects forged prices and distinguishes sold-out and quota failures",async()=>{expect((await POST(request({...input,totalPaise:1}))).status).toBe(400);mocks.gateway.mockResolvedValue({data:null,error:{code:"PT409",message:"Rooms taken"}});expect((await POST(request())).status).toBe(409);mocks.gateway.mockResolvedValue({data:null,error:{code:"PT429",message:"Complete an existing hold"}});expect((await POST(request())).status).toBe(429);});
});
