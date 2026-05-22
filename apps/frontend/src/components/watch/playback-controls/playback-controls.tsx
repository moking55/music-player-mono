"use client";

import { Play, Pause } from "lucide-react";

import type { PlaybackControlsProps } from "./types";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function PlaybackControls({
  isPlaying,
  currentTime,
  videoId,
  onPlayPause,
  onSeek,
}: PlaybackControlsProps) {
  if (!videoId) {
    return (
      <div className="flex items-center justify-center py-3 bg-gray-800 border-b border-gray-700">
        <p className="text-gray-400 text-sm">Waiting for video...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 border-b border-gray-700">
      <button
        type="button"
        onClick={onPlayPause}
        className="p-2 rounded-full bg-white text-black hover:bg-gray-200 transition-colors"
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12 text-right">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={3600}
          value={currentTime}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="flex-1 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer accent-blue-500"
        />
      </div>
    </div>
  );
}
