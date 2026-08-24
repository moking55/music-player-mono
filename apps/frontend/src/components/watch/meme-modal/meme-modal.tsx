"use client";

import { useEffect, useState } from "react";
import type { MemeModalProps } from "./types";
import ConfettiBomb from "@/components/watch/confetti-bomb";

export default function MemeModal({ imageUrl, onDismiss }: MemeModalProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss?.();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 z-50"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
    >
      <ConfettiBomb active={showConfetti} onComplete={() => setShowConfetti(false)} />

      <div
        className="max-w-lg w-full mx-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Meme"
          className="w-full rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
}
