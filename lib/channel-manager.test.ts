import { describe, expect, it } from "vitest";
import source from "../supabase/data/teesta-inventory.json";
import { summariseInventory } from "./channel-manager";

describe("Direct channel inventory mapping",()=>{
  it("matches the owner's 25 rooms and 70-person capacity",()=>{
    const inventory=summariseInventory(source.rooms);
    expect(inventory.rooms).toBe(25);
    expect(inventory.capacity).toBe(70);
    expect(inventory.categories.map(category=>category.rooms)).toEqual([14,4,6,1]);
  });
  it("never assumes the six-person inventory is the sofa photograph",()=>{
    expect(summariseInventory(source.rooms).categories[3].displayType).toBeNull();
  });
  it("rejects capacity mismatches instead of publishing them",()=>{
    expect(()=>summariseInventory([{category:"double-room",occupancy:3}])).toThrow();
  });
});
