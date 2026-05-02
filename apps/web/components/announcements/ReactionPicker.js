"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const emojis = ["👍", "❤️", "😂", "😮", "😢", "😡"];

export default function ReactionPicker({
  open,
  anchorRef,
  onSelect,
  onClose
}) {
  const panelRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) return;

    const updatePosition = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 10,
        left: rect.left + rect.width / 2
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      if (anchorRef?.current?.contains(event.target)) return;
      onClose?.();
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open) {
      setAnimateIn(false);
      return;
    }

    const frame = requestAnimationFrame(() => setAnimateIn(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      <div
        ref={panelRef}
        className={`pointer-events-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg transition-all duration-200 dark:border-slate-700 dark:bg-slate-900 ${
          animateIn ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        style={{
          position: "fixed",
          top: coords.top,
          left: coords.left,
          transform: "translate(-50%, -100%)",
          zIndex: 9999
        }}
      >
        <div className="flex items-center gap-1">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded-xl px-2 py-1 text-lg transition hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => onSelect?.(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
