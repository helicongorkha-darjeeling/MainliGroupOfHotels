"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Expand, Images, X } from "lucide-react";
import type { PropertyPhoto } from "@/lib/property";

export function PropertyGallery({ photos }: { photos: PropertyPhoto[] }) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [filter, setFilter] = useState<string>("All photos");
  const filters = ["All photos", ...new Set(photos.map((photo) => photo.category))];
  const [selected, setSelected] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState("");
  const visible = filter === "All photos" ? photos : photos.filter((photo) => photo.category === filter);
  const current = visible[selected];

  function open(index: number) {
    setSelected(index);
    setIsOpen(true);
    dialogRef.current?.showModal();
  }

  function move(direction: number) {
    setSelected((index) => (index + direction + visible.length) % visible.length);
  }

  return (
    <div className="photo-gallery">
      <div className="photo-gallery-toolbar">
        <div className="photo-filters" role="group" aria-label="Filter property photos">
          {filters.map((label) => (
            <button type="button" key={label} aria-pressed={filter === label} onClick={() => { setFilter(label); setSelected(0); }}>{label}</button>
          ))}
        </div>
        <button type="button" className="photo-view-all" onClick={() => open(0)}><Images size={17} aria-hidden="true" /> View {visible.length} {visible.length === 1 ? "photo" : "photos"}</button>
      </div>
      <div className={`photo-grid ${visible.length === 1 ? "photo-grid-single" : ""}`}>
        {visible.slice(0, 5).map((photo, index) => (
          <button type="button" className="photo-tile" key={photo.src} onClick={() => open(index)} aria-label={`View photo: ${photo.caption}`}>
            <Image src={photo.src} alt={photo.alt} fill sizes={index === 0 ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"} className="cover-image" style={{ objectPosition: photo.objectPosition }} />
            <span className="photo-tile-caption">{photo.caption}</span>
            <span className="photo-expand" aria-hidden="true"><Expand size={17} /></span>
          </button>
        ))}
      </div>
      <dialog
        ref={dialogRef}
        className="photo-dialog"
        aria-labelledby={`${id}-photo-title`}
        onClose={() => setIsOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
          if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
        }}
      >
        <div className="photo-dialog-header">
          <div><p>Hotel Teesta</p><h3 id={`${id}-photo-title`}>{current?.caption}</h3></div>
          <button type="button" className="quiet-icon" aria-label="Close photo gallery" onClick={() => dialogRef.current?.close()}><X size={22} /></button>
        </div>
        <div className="photo-stage">
          {isOpen && current && <>
            {loadedSrc !== current.src && <span className="photo-loading" role="status">Loading photograph…</span>}
            <Image src={current.src} alt={current.alt} fill loading="eager" sizes="(max-width: 640px) 100vw, 90vw" className="photo-full-image" onLoad={() => setLoadedSrc(current.src)} />
          </>}
          {visible.length > 1 && <>
            <button type="button" className="photo-nav photo-nav-prev" aria-label="Previous photo" onClick={() => move(-1)}><ArrowLeft size={22} /></button>
            <button type="button" className="photo-nav photo-nav-next" aria-label="Next photo" onClick={() => move(1)}><ArrowRight size={22} /></button>
          </>}
        </div>
        <div className="photo-dialog-footer">
          <p role="status">{selected + 1} / {visible.length} · {current?.caption}</p>
          <div className="photo-thumbnails" aria-label="Choose a photo">
            {visible.map((photo, index) => (
              <button type="button" key={photo.src} aria-label={`Show ${photo.caption}`} aria-pressed={index === selected} onClick={() => setSelected(index)}>
                <Image src={photo.src} alt="" fill sizes="64px" className="cover-image" style={{ objectPosition: photo.objectPosition }} />
              </button>
            ))}
          </div>
        </div>
      </dialog>
    </div>
  );
}
