"use client";

import { GripVertical, Play, ArrowUp, ArrowDown, X } from "lucide-react";

import type { VideoItem } from "shared-types";

type QueuePanelProps = {
  queue: VideoItem[];
  currentIndex: number;
  onForcePlay: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (index: number) => void;
};

export default function QueuePanel({
  queue,
  currentIndex,
  onForcePlay,
  onReorder,
  onRemove,
}: QueuePanelProps) {
  const handleMoveUp = (index: number) => {
    if (index > 0) {
      onReorder(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < queue.length - 1) {
      onReorder(index, index + 1);
    }
  };

  const handleRemove = (index: number) => {
    if (index !== currentIndex) {
      onRemove(index);
    }
  };

  return (
    <div className="absolute right-4 top-4 bottom-4 w-72 z-10 bg-black/70 backdrop-blur border border-gray-700 rounded-lg flex flex-col">
      <div className="p-3 border-b border-gray-700">
        <h3 className="text-white text-sm font-medium flex items-center gap-2">
          <Play className="h-4 w-4" />
          Queue ({queue.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {queue.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No videos in queue</p>
        ) : (
          <div className="grid gap-1">
            {queue.map((video, index) => (
              <div
                key={`${video.videoId}-${index}`}
                className={`group flex items-center gap-1.5 p-2 rounded-md transition-colors ${
                  index === currentIndex
                    ? "bg-blue-900/40 border border-blue-500/50"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 flex-shrink-0">
                  <GripVertical size={14} />
                </div>

                <div className="w-16 h-9 relative rounded overflow-hidden flex-shrink-0 bg-gray-800">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${index === currentIndex ? "text-white font-medium" : "text-gray-300"}`}>
                    {video.title}
                  </p>
                  {index === currentIndex && (
                    <p className="text-xs text-blue-400">Now Playing</p>
                  )}
                </div>

                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === queue.length - 1}
                    className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="p-0.5 text-red-400 hover:text-red-300"
                    title="Remove"
                  >
                    <X size={12} />
                  </button>
                </div>

                {index !== currentIndex && (
                  <button
                    type="button"
                    onClick={() => onForcePlay(index)}
                    className="p-1 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded flex-shrink-0"
                    title="Force play"
                  >
                    <Play size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
