"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function HeroGallery({ images }: { images: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);

  const scrollTo = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(images.length - 1, i));
      setIndex(next);
      const el = containerRef.current;
      if (!el) return;
      const child = el.children[next] as HTMLElement | undefined;
      if (child) el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
    },
    [images.length]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollTo(index + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollTo(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, scrollTo]);

  const onScroll = () => {
    if (dragging) return;
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w === 0) return;
    const i = Math.round(el.scrollLeft / w);
    if (i !== index) setIndex(i);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const el = containerRef.current;
    if (!el) return;
    dragRef.current = { startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    setDragging(true);
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 4) dragRef.current.moved = true;
    el.scrollLeft = dragRef.current.startScroll - dx;
  };

  const onPointerEnd = () => {
    const state = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    const el = containerRef.current;
    if (!el || !state) return;
    const w = el.clientWidth;
    const i = Math.round(el.scrollLeft / w);
    scrollTo(i);
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className={`no-scrollbar flex overflow-x-auto snap-x snap-mandatory overscroll-x-contain select-none ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        role="region"
        aria-roledescription="carousel"
        aria-label="Listing photos and floor plan"
        tabIndex={0}
      >
        {images.map((src, i) => (
          <div key={src} className="min-w-full snap-center aspect-[16/10] bg-[color:var(--color-muted)]">
            <img
              src={src}
              alt={`Listing media ${i + 1} of ${images.length}`}
              draggable={false}
              loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"}
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>
        ))}
      </div>

      <div className="absolute top-4 right-4 rounded-full bg-black/55 text-white text-xs px-3 py-1.5 backdrop-blur">
        {index + 1} / {images.length}
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            aria-label={`Go to image ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-8 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
