import { describe,expect,it } from "vitest";
import { reservationInputSchema,isAvailable } from "./reservations";
import { hotelToday,addHotelDays } from "./stay";
const start=addHotelDays(hotelToday(),1);
const input={requestId:"82000000-0000-4000-8000-000000000001",category:"triple-room",checkIn:start,checkOut:addHotelDays(start,2),guests:3,kind:"tentative",fullName:" Test Guest ",email:"test@example.com",phone:"9876543210"};
describe("reservation boundary",()=>{
  it("normalises guest contacts for a category hold",()=>{expect(reservationInputSchema.parse(input)).toMatchObject({fullName:"Test Guest",phone:"+919876543210",guests:3,kind:"tentative"});});
  it("rejects attempts to supply privileged booking, price and identity fields",()=>{for(const field of ["userId","status","holdUntil","totalPaise","paidPaise","roomNumbers"])expect(reservationInputSchema.safeParse({...input,[field]:"confirmed"}).success).toBe(false);});
  it("rejects stays outside the inventory window and unknown categories",()=>{for(const invalid of [{checkOut:addHotelDays(start,31)},{checkOut:start},{guests:13},{category:"family-room-sofa"}])expect(reservationInputSchema.safeParse({...input,...invalid}).success).toBe(false);});
  it("does not equate published capacity with enough rooms for a group",()=>{const choice={code:"six-person-room",name:"Six-person Room",capacity:6,rooms:2,availableRooms:1,bookable:true,quote:{subtotalPaise:1440000,taxPaise:null,totalPaise:1440000,taxConfirmed:false,nights:1,nightlyPrices:[]}};expect(isAvailable(choice)).toBe(false);expect(isAvailable({...choice,rooms:1})).toBe(true);expect(isAvailable({...choice,rooms:1,bookable:false})).toBe(false);});
});
