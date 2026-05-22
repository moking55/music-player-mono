"use client";

import { useEffect } from "react";
import type { MemeModalProps } from "./types";

export default function MemeModal({ imageUrl, base64, onDismiss }: MemeModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss?.();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onDismiss]);

  const src = base64 ?? imageUrl;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 z-50"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-w-lg w-full mx-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt="Meme"
          className="w-full rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
}
