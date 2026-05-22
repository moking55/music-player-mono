"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useImmer } from "use-immer";
import { useWatchRoom } from "@/hooks/use-watch-room";
import { usePlayerControl } from "@/hooks/use-player-control";
import { useQueue } from "@/hooks/use-queue";
import { useDanmu } from "@/hooks/use-danmu";
import { useMeme } from "@/hooks/use-meme";
import useSocket from "@/hooks/use-socket";
import QRCode from "@/components/watch/qr-code";
import QueuePanel from "@/components/watch/queue-panel";
import DanmuOverlay from "@/components/watch/danmu-overlay";
import MemeModal from "@/components/watch/meme-modal";

type YTPlayer = {
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getVideoData: () => { video_id: string };
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
};

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

type HostState = {
  isReady: boolean;
  player: YTPlayer | null;
};

export default function HostContainer() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");

  const { joinRoom } = useWatchRoom();
  const {
    playerState,
    pendingCommand,
    clearPendingCommand,
    skip,
  } = usePlayerControl(roomId);
  const {
    queue,
    currentIndex,
    forcePlay,
    reorderQueue: reorderQueueFn,
    removeFromQueue: removeQueueFn,
  } = useQueue(roomId);
  const { danmuList, removeDanmu } = useDanmu(roomId, { mode: "receive" });
  const { currentMeme, dismissMeme } = useMeme(roomId, { mode: "receive" });
  const { emit } = useSocket();

  const [state, setState] = useImmer<HostState>({
    isReady: false,
    player: null,
  });

  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<YTPlayer | null>(null);
  const apiLoadedRef = useRef(false);
  const currentVideoIdRef = useRef<string>("");

  const emitPlayerState = useCallback(
    (playing: boolean, currentTime: number, videoId: string) => {
      if (!roomId) return;
      emit("player-state-update", {
        roomId,
        playing,
        currentTime,
        videoId,
      });
    },
    [roomId, emit],
  );

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
              draft.player = player;
            });
            playerInstanceRef.current = player;
          },
          onStateChange: (event: { data: number }) => {
            const videoData = player.getVideoData?.();
            const videoId = videoData?.video_id || currentVideoIdRef.current;
            const currentTime = player.getCurrentTime?.() ?? 0;

            if (event.data === window.YT?.PlayerState?.PLAYING) {
              emitPlayerState(true, currentTime, videoId);
            } else if (event.data === window.YT?.PlayerState?.PAUSED) {
              emitPlayerState(false, currentTime, videoId);
            } else if (event.data === window.YT?.PlayerState?.ENDED) {
              skip();
            }
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
  }, [roomId, setState, skip, emitPlayerState]);

  useEffect(() => {
    if (!roomId) return;
    joinRoom(roomId);
  }, [roomId, joinRoom]);

  useEffect(() => {
    const player = playerInstanceRef.current;
    if (!player || !pendingCommand.type) return;

    switch (pendingCommand.type) {
      case "skip": {
        if (pendingCommand.videoId) {
          currentVideoIdRef.current = pendingCommand.videoId;
          player.loadVideoById(pendingCommand.videoId);
        }
        break;
      }
      case "play": {
        player.playVideo();
        break;
      }
      case "pause": {
        player.pauseVideo();
        break;
      }
      case "seek": {
        if (pendingCommand.time !== undefined) {
          player.seekTo(pendingCommand.time, true);
          const videoData = player.getVideoData?.();
          const videoId = videoData?.video_id || currentVideoIdRef.current;
          emitPlayerState(playerState.playing, pendingCommand.time, videoId);
        }
        break;
      }
    }

    clearPendingCommand();
  }, [pendingCommand, clearPendingCommand]);

  useEffect(() => {
    const player = playerInstanceRef.current;
    if (!player || !playerState.videoId) return;

    const currentPos = player.getCurrentTime?.() ?? 0;
    if (Math.abs(currentPos - playerState.currentTime) > 2) {
      player.seekTo(playerState.currentTime, true);
    }
  }, [playerState.currentTime, playerState.videoId]);

  if (!roomId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-white">No room code provided</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />

      <div ref={playerRef} className="absolute inset-0" />

      {!state.isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto mb-4" />
            <p className="text-gray-400">Loading player...</p>
          </div>
        </div>
      )}

      {state.isReady && (
        <>
          <DanmuOverlay danmuList={danmuList} onRemove={removeDanmu} />

          {currentMeme && (
            <MemeModal
              base64={currentMeme.startsWith("data:") ? currentMeme : undefined}
              imageUrl={currentMeme.startsWith("data:") ? undefined : currentMeme}
              onDismiss={dismissMeme}
            />
          )}

          {queue.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <QRCode roomId={roomId} variant="idle" />
            </div>
          ) : (
            <>
              <QRCode roomId={roomId} variant="playing" />
              <QueuePanel
                queue={queue}
                currentIndex={currentIndex}
                onForcePlay={forcePlay}
                onReorder={reorderQueueFn}
                onRemove={removeQueueFn}
              />
            </>
          )}
        </>
      )}
    </main>
  );
}
