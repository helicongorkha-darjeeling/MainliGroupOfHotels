import { roomStartingPrice, type PublicRoom } from "@/lib/hotel-content";
export function RoomComparisonTable({ rooms }: { rooms: PublicRoom[] }) {
  return <div className="room-comparison overflow-x-auto" tabIndex={0} role="region" aria-label="Compare Hotel Teesta room facts">
    <table className="w-full border-collapse text-left">
      <caption>Hotel Teesta room comparison · starting rates, subject to seasonal rates and confirmed taxes</caption>
      <thead><tr>{["Room", "Room size", "Beds", "Maximum occupancy", "Confirmed inclusions", "Starting price per night"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
      <tbody>{rooms.map(room => <tr key={room.id}>
        <th scope="row">{room.name}</th>
        <td>{room.sizeSqM === undefined ? "On request" : `${room.sizeSqM} sq m / ${Math.round(room.sizeSqM * 10.7639)} sq ft`}</td>
        <td>{room.bedConfiguration}</td>
        <td>Up to {room.maxGuests} guests<br />{room.maxAdults === undefined ? null : `Adults: ${room.maxAdults}. `}{room.maxChildren === undefined ? "Child policy: on request" : `Children: ${room.maxChildren}`}</td>
        <td>{room.inclusions.length ? <ul>{room.inclusions.map(fact => <li key={fact.label}>{fact.label}: {fact.value}</li>)}</ul> : "On request"}</td>
        <td>{roomStartingPrice(room)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

