"use client";

import Image from "next/image";
import { useState } from "react";

const photographs = [
  { src: "/images/teesta-double-room-window.webp", alt: "Double room with wooden furnishings at Hotel Teesta", position: "50% 65%", label: "Double room" },
  { src: "/images/teesta-lobby.webp", alt: "Wooden windows and seating in Hotel Teesta’s lobby", position: "50% 60%", label: "Lobby" },
  { src: "/images/teesta-dining-room.webp", alt: "Hotel Teesta restaurant with wooden tables and windows", position: "50% 65%", label: "Restaurant" },
  { src: "/images/teesta-exterior-front.webp", alt: "Hotel Teesta and its restaurant in Darjeeling", position: "50% 42%", label: "Hotel exterior" },
];

export function HeroPhotographs() {
  const [selected, setSelected] = useState(0);
  return <>
    <div className="mainali-hero-photographs">
      {photographs.map((photo, index) => <Image key={photo.src} src={photo.src} alt={photo.alt} fill sizes="100vw" preload={index === 0} className={selected === index ? "mainali-hero-photo is-selected" : "mainali-hero-photo"} style={{ objectPosition: photo.position }} aria-hidden={selected !== index} />)}
    </div>
    <div className="mainali-hero-shade" />
    <div className="hero-photo-controls" role="group" aria-label="Hero photographs">
      {photographs.map((photo, index) => <button key={photo.src} type="button" aria-label={`Show ${photo.label.toLowerCase()}`} aria-pressed={selected === index} onClick={() => setSelected(index)}><span /></button>)}
    </div>
  </>;
}
