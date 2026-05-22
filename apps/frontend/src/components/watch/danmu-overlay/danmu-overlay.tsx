"use client";

import { useCallback, useEffect, useState } from "react";

import type { DanmuOverlayProps } from "./types";

type DanmuWithAnimation = {
  id: number;
  text: string;
  lane: number;
  duration: number;
  delay: number;
};

export default function DanmuOverlay({ danmuList, onRemove }: DanmuOverlayProps) {
  const [activeDanmu, setActiveDanmu] = useState<DanmuWithAnimation[]>([]);

  useEffect(() => {
    const existingIds = new Set(activeDanmu.map((d) => d.id));
    const newItems = danmuList
      .filter((d) => !existingIds.has(d.id))
      .map((d) => ({
        ...d,
        duration: 6 + Math.random() * 2,
        delay: Math.random() * 0.5,
      }));

    if (newItems.length > 0) {
      setActiveDanmu((prev) => [...prev, ...newItems]);
    }
  }, [danmuList]);

  const handleAnimationEnd = useCallback(
    (id: number) => {
      setActiveDanmu((prev) => prev.filter((d) => d.id !== id));
      onRemove?.(id);
    },
    [onRemove],
  );

  if (activeDanmu.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {activeDanmu.map((danmu) => (
        <div
          key={danmu.id}
          className="absolute whitespace-nowrap text-white text-lg font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-danmu"
          style={{
            top: `${danmu.lane * 10 + 5}%`,
            animationDuration: `${danmu.duration}s`,
            animationDelay: `${danmu.delay}s`,
          }}
          onAnimationEnd={() => handleAnimationEnd(danmu.id)}
        >
          {danmu.text}
        </div>
      ))}
    </div>
  );
}
