"use client";

import { useImmer } from "use-immer";
import { Search, Plus, Loader2, Link, Play, ArrowUp, ArrowDown, X } from "lucide-react";
import { useYouTubeSearch } from "@/hooks/use-youtube-search";
import { useYouTubeOEmbed } from "@/hooks/use-youtube-oembed";

import type { VideoSearchProps, VideoSearchState } from "./types";

function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();

  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export default function VideoSearch({
  queue,
  currentIndex,
  onAddToQueue,
  onForcePlay,
  onReorder,
  onRemove,
}: VideoSearchProps) {
  const {
    results,
    loading: searchLoading,
    error: searchError,
    search,
    clearResults,
  } = useYouTubeSearch();
  const { fetchInfo, loading: oembedLoading, error: oembedError } = useYouTubeOEmbed();

  const [state, setState] = useImmer<VideoSearchState>({
    query: "",
  });

  const isYouTubeUrl = extractYouTubeId(state.query) !== null;
  const loading = oembedLoading || searchLoading;
  const error = oembedError || searchError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractYouTubeId(state.query);

    if (videoId) {
      const info = await fetchInfo(videoId);
      if (info) {
        onAddToQueue(videoId, info.title, info.thumbnail_url);
      } else {
        onAddToQueue(videoId, `YouTube Video (${videoId})`, `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
      }
      setState((draft) => {
        draft.query = "";
      });
    } else if (state.query.trim()) {
      search(state.query);
    }
  };

  const handleAddToQueue = (videoId: string, title: string, thumbnail: string) => {
    onAddToQueue(videoId, title, thumbnail);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0 && onReorder) {
      onReorder(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < queue.length - 1 && onReorder) {
      onReorder(index, index + 1);
    }
  };

  const handleRemove = (index: number) => {
    if (onRemove && index !== currentIndex) {
      onRemove(index);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit} className="p-3 border-b border-gray-700">
        <div className="flex gap-2">
          <div className="relative flex-1">
            {isYouTubeUrl ? (
              <Link
                className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400"
                size={16}
              />
            ) : (
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
            )}
            <input
              type="text"
              value={state.query}
              onChange={(e) =>
                setState((draft) => {
                  draft.query = e.target.value;
                })
              }
              placeholder={isYouTubeUrl ? "YouTube link detected — press Enter to add" : "Search YouTube or paste link..."}
              className="w-full pl-9 pr-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !state.query.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : isYouTubeUrl ? "Add" : "Search"}
          </button>
        </div>
      </form>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4 text-red-500 text-center">
            <p>{error}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-400">Search Results</h3>
              <button
                type="button"
                onClick={clearResults}
                className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                title="Clear search results"
              >
                Clear
              </button>
            </div>
            <ul className="space-y-2">
              {results.map((video) => (
                <li
                  key={video.videoId}
                  className="flex items-center gap-3 p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-20 h-12 object-cover rounded"
                  />
                  <span className="flex-1 text-sm text-white truncate">{video.title}</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddToQueue(video.videoId, video.title, video.thumbnail)
                    }
                    className="p-2 text-blue-500 hover:text-blue-400"
                    title="Add to queue"
                    aria-label={`Add ${video.title} to queue`}
                  >
                    <Plus size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {queue.length > 0 && (
          <div className="p-3">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Queue</h3>
            <ul className="space-y-1">
              {queue.map((video, index) => (
                <li
                  key={`${video.videoId}-${index}`}
                  className={`group flex items-center gap-2 p-2 rounded transition-colors ${
                    index === currentIndex
                      ? "bg-blue-900/50 border border-blue-500"
                      : "bg-gray-800"
                  }`}
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-20 h-12 object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{video.title}</p>
                    {index === currentIndex && (
                      <p className="text-xs text-blue-400">Now Playing</p>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === queue.length - 1}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowDown size={14} />
                    </button>
                    {index !== currentIndex && onForcePlay && (
                      <button
                        type="button"
                        onClick={() => onForcePlay(index)}
                        className="p-1 text-green-400 hover:text-green-300"
                      >
                        <Play size={14} />
                      </button>
                    )}
                    {index !== currentIndex && onRemove && (
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {results.length === 0 && queue.length === 0 && !loading && !error && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-center px-4">Search YouTube or paste a video link to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
