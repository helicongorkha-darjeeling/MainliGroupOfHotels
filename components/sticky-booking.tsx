"use client";
import { useEffect, useState } from "react";
import { startingPrice } from "@/lib/hotel-content";
export function StickyBooking() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const card = document.getElementById("check-rooms"); if (!card) return;
    let passed = false;
    const update = () => setShow(passed && !document.querySelector("dialog[open]") && !document.activeElement?.matches("input:not([type=hidden]),textarea,select") && !(window.visualViewport && window.innerHeight - window.visualViewport.height > 160));
    const observer = new IntersectionObserver(([entry]) => { passed = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0; update(); }); observer.observe(card);
    const dialogs = new MutationObserver(update); dialogs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    document.addEventListener("focusin", update); document.addEventListener("focusout", update); window.visualViewport?.addEventListener("resize", update);
    return () => { observer.disconnect(); dialogs.disconnect(); document.removeEventListener("focusin", update); document.removeEventListener("focusout", update); window.visualViewport?.removeEventListener("resize", update); };
  }, []);
  return <div className="sticky-booking" hidden={!show}><span>From {startingPrice} a night<small>For 1 guest · taxes pending</small></span><button className="button button-primary" onClick={() => {
    const card = document.getElementById("check-rooms"); card?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    card?.querySelector<HTMLButtonElement>(".search-toggle[aria-expanded=false]")?.click(); setTimeout(() => card?.querySelector<HTMLButtonElement>("[data-date-trigger]")?.click(), 400);
  }}>Check availability</button></div>;
}
