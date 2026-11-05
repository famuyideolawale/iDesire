"use client";
import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";

export function CataloguePhoto({ src, alt, sizes = "(max-width: 760px) 50vw, 25vw" }: {
  src: string; alt: string; sizes?: string;
}) {
  return src.startsWith("/") && !src.startsWith("//") && !src.startsWith("/media/")
    ? <Image src={src} alt={alt} width={900} height={900} sizes={sizes} />
    : <img src={src} alt={alt} loading="lazy" />;
}

export function ProductGallery({ src, alt, children, photos = [] }: {
  src: string; alt: string; children?: ReactNode; photos?: { src: string; label: string }[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState(0);
  const views = [{ src, label: "Full product" }, ...photos];
  const view = views[selected] ?? views[0];
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  return <>
    <button ref={trigger} type="button" className="gallery-trigger" aria-label={"Enlarge " + alt} onClick={() => {
      setZoom(1);
      setSelected(0);
      dialog.current?.showModal();
    }}>
      <CataloguePhoto src={src} alt={alt} sizes="(max-width: 760px) 90vw, 46vw" />
      <span>Enlarge photo</span>
    </button>
    {children}
    <dialog ref={dialog} className="product-gallery-dialog" aria-label="Product photo viewer" onClose={() => trigger.current?.focus()}>
      <div className="gallery-toolbar">
        <label>Zoom <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label>
        <button type="button" onClick={() => dialog.current?.close()}>Close photo</button>
      </div>
      {photos.length > 0 && <div className="gallery-toolbar" aria-label="Photo views">
        {views.map((photo, index) => <button key={photo.label} type="button" aria-pressed={selected === index} onClick={() => {setSelected(index); setZoom(1);}}>{photo.label}</button>)}
      </div>}
      <div className="gallery-stage" onTouchStart={e => {
        if (e.touches.length !== 2) return;
        const [a,b] = Array.from(e.touches);
        pinch.current = { distance: Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY), zoom };
      }} onTouchMove={e => {
        if (!pinch.current || e.touches.length !== 2) return;
        const [a,b] = Array.from(e.touches);
        const distance = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
        setZoom(Math.max(1, Math.min(3, pinch.current.zoom * distance / Math.max(1, pinch.current.distance))));
      }} onTouchEnd={() => { pinch.current = null; }} onTouchCancel={() => { pinch.current = null; }}>
        <img src={view.src} alt={selected ? alt + " · " + view.label : alt} loading="lazy" style={{width: (zoom * 100) + "%"}} />
      </div>
    </dialog>
  </>;
}
