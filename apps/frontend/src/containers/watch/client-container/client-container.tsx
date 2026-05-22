"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useImmer } from "use-immer";
import { Wifi, WifiOff, AlertCircle } from "lucide-react";
import { useWatchRoom } from "@/hooks/use-watch-room";
import { usePlayerControl } from "@/hooks/use-player-control";
import { useQueue } from "@/hooks/use-queue";
import { useDanmu } from "@/hooks/use-danmu";
import { useMeme } from "@/hooks/use-meme";
import TabNavigation from "@/components/watch/tab-navigation";
import VideoSearch from "@/components/watch/video-search";
import PlaybackControls from "@/components/watch/playback-controls";
import DanmuOverlay from "@/components/watch/danmu-overlay";
import MemeModal from "@/components/watch/meme-modal";

import type { ClientState } from "./types";

declare global {
  interface Window {
    YT: {
      Player: new (element: HTMLElement, config: Record<string, unknown>) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

type YTPlayer = {
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getVideoData: () => { video_id: string };
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
};

export default function ClientContainer() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");

  const { joinRoom, connected, error: roomError } = useWatchRoom();
  const { playerState, play, pause, seek } = usePlayerControl(roomId);
  const { queue, currentIndex, addToQueue, forcePlay, reorderQueue: reorderQueueFn, removeFromQueue: removeQueueFn } = useQueue(roomId);
  const { danmuList, sendDanmu } = useDanmu(roomId, { mode: "send" });
  const { currentMeme, uploading, error: memeError, sendMeme } = useMeme(roomId, { mode: "send" });

  const [state, setState] = useImmer<ClientState>({
    activeTab: "queue",
    isReady: false,
  });

  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<YTPlayer | null>(null);
  const apiLoadedRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;

    const initPlayer = () => {
      if (!playerRef.current || playerInstanceRef.current) return;

      const player = new window.YT.Player(playerRef.current, {
        height: "100%",
        width: "100%",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: () => {
            setState((draft) => {
              draft.isReady = true;
            });
            playerInstanceRef.current = player;
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else if (!apiLoadedRef.current) {
      apiLoadedRef.current = true;
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  }, [roomId, setState]);

  useEffect(() => {
    if (!roomId) return;
    joinRoom(roomId);
  }, [roomId, joinRoom]);

  useEffect(() => {
    const player = playerInstanceRef.current;
    if (!player || !playerState.videoId) return;

    if (playerState.playing && player.getPlayerState?.() !== 1) {
      player.loadVideoById(playerState.videoId);
      player.playVideo();
    } else if (!playerState.playing && player.getPlayerState?.() === 1) {
      player.pauseVideo();
    }
  }, [playerState]);

  useEffect(() => {
    const player = playerInstanceRef.current;
    if (!player || !playerState.videoId) return;

    const currentPos = player.getCurrentTime?.() ?? 0;
    if (Math.abs(currentPos - playerState.currentTime) > 2) {
      player.seekTo(playerState.currentTime, true);
    }
  }, [playerState.currentTime, playerState.videoId]);

  const handleTabChange = (tab: "queue" | "danmu" | "meme") => {
    setState((draft) => {
      draft.activeTab = tab;
    });
  };

  const handleSeek = (time: number) => {
    seek(time);
  };

  const handlePlayPause = () => {
    if (playerState.playing) {
      pause();
    } else {
      play();
    }
  };

  if (!roomId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-white">No room code provided</p>
      </main>
    );
  }

  const displayError = roomError || null;

  return (
    <main className="min-h-screen bg-gray-900 relative overflow-hidden flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-gray-300">Room: {roomId}</span>
          {connected ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 text-xs">
              <Wifi size={12} />
              <span className="hidden sm:inline">Connected</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-900/50 text-red-400 text-xs">
              <WifiOff size={12} />
              <span className="hidden sm:inline">Disconnected</span>
            </span>
          )}
        </div>
      </header>

      {displayError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-900/30 border-b border-red-800 text-red-300">
          <AlertCircle size={16} />
          <p className="text-sm">{displayError}</p>
        </div>
      )}

      <div ref={playerRef} className="w-full h-48 sm:h-64 md:h-80 lg:h-96 flex-shrink-0" />

      <DanmuOverlay danmuList={danmuList} />

      {currentMeme && (
        <MemeModal
          base64={currentMeme.startsWith("data:") ? currentMeme : undefined}
          imageUrl={currentMeme.startsWith("data:") ? undefined : currentMeme}
        />
      )}

      {!state.isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 z-20">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto mb-4" />
            <p className="text-gray-400">Loading player...</p>
          </div>
        </div>
      )}

      {state.isReady && (
        <div className="flex-1 flex flex-col min-h-0">
          <PlaybackControls
            isPlaying={playerState.playing}
            currentTime={playerState.currentTime}
            videoId={playerState.videoId}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
          />

          <TabNavigation activeTab={state.activeTab} onTabChange={handleTabChange} />

          <div className="flex-1 overflow-hidden">
            {state.activeTab === "queue" && (
              <VideoSearch
                roomId={roomId}
                queue={queue}
                currentIndex={currentIndex}
                onAddToQueue={addToQueue}
                onForcePlay={forcePlay}
                onReorder={reorderQueueFn}
                onRemove={removeQueueFn}
              />
            )}
            {state.activeTab === "danmu" && (
              <div className="p-4 h-full">
                <div className="text-white text-center">
                  <p className="mb-4">Send danmu to appear on screen</p>
                  {sendDanmu && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target as HTMLFormElement;
                        const input = form.elements.namedItem("danmu") as HTMLInputElement;
                        if (input.value.trim()) {
                          sendDanmu(input.value);
                          input.value = "";
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        name="danmu"
                        placeholder="Type your danmu..."
                        className="flex-1 px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Send
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
            {state.activeTab === "meme" && (
              <div className="p-4 h-full">
                <div className="text-white text-center">
                  <p className="mb-4">Upload a meme to show on screen</p>
                  <label className="inline-block px-6 py-3 bg-purple-600 text-white rounded cursor-pointer hover:bg-purple-700">
                    {uploading ? "Uploading..." : "Choose Image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && sendMeme) {
                          sendMeme(file);
                        }
                      }}
                      disabled={uploading}
                    />
                  </label>
                  {memeError && <p className="mt-2 text-red-500">{memeError}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
