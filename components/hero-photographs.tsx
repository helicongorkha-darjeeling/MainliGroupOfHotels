"use client";
import Image from "next/image";
import { useState } from "react";
import { brandedPhoto } from "@/lib/photo-assets";
const photographs = [
  { src: "/images/teesta-double-room-window.webp", alt: "Double room at Hotel Teesta", label: "Double room" },
  { src: "/images/teesta-lobby.webp", alt: "Hotel Teesta lobby", label: "Lobby" },
  { src: "/images/teesta-dining-room.webp", alt: "Hotel Teesta restaurant", label: "Restaurant" },
  { src: "/images/teesta-exterior-front.webp", alt: "Hotel Teesta exterior", label: "Hotel exterior" },
];
export function HeroPhotographs() {
  const [selected, setSelected] = useState(0);
  return <><div className="mainali-hero-photographs">{photographs.map((photo, index) => <picture key={photo.src} className="hero-picture">
    <source media="(min-width:640px)" srcSet={brandedPhoto(photo.src, "hero")} />
    <Image src={brandedPhoto(photo.src, "hero-mobile")} alt={photo.alt} fill preload={index === 0} sizes="100vw" className={selected === index ? "mainali-hero-photo is-selected" : "mainali-hero-photo"} aria-hidden={selected !== index} />
  </picture>)}</div><div className="mainali-hero-shade" /><div className="hero-photo-controls" role="group" aria-label="Hero photographs">{photographs.map((photo,index) => <button key={photo.src} type="button" aria-label={"Show " + photo.label.toLowerCase()} aria-pressed={selected === index} onClick={() => setSelected(index)}><span /></button>)}</div></>;
}
