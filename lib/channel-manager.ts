export type InventorySourceRoom = { category: string; occupancy: number };
export function summariseInventory(rooms: InventorySourceRoom[]) {
  const categories = [
    { inventoryId:"double-room", title:"Double Room", capacity:2, displayType:"double-room", ratePaise:250_000, mapping:"Display layout identified; database publication pending" },
    { inventoryId:"triple-room", title:"Triple Room", capacity:3, displayType:"triple-room", ratePaise:null, mapping:"Display layout identified; rate and publication pending" },
    { inventoryId:"four-person-room", title:"Four-person Room", capacity:4, displayType:"four-person-room", ratePaise:null, mapping:"Display layout identified; rate and publication pending" },
    { inventoryId:"six-person-room", title:"Six-person Room", capacity:6, displayType:null, ratePaise:null, mapping:"Confirm whether this is the photographed Family Room with Sofa" },
  ];
  if (rooms.some(room=>!categories.some(category=>category.inventoryId===room.category && category.capacity===room.occupancy))) throw new Error("Inventory category or capacity mismatch");
  return {
    rooms:rooms.length,
    capacity:rooms.reduce((total,room)=>total+room.occupancy,0),
    categories:categories.map(category=>({...category,rooms:rooms.filter(room=>room.category===category.inventoryId).length})),
  };
}
