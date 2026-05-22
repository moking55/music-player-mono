"use client";

import { useCallback, useEffect } from "react";
import { useImmer } from "use-immer";
import useSocket from "@/hooks/use-socket";

type PlayerState = {
  playing: boolean;
  currentTime: number;
  videoId: string;
};

type PlayerControlState = {
  playerState: PlayerState;
  isPlaying: boolean;
  pendingCommand: {
    type: "play" | "pause" | "seek" | "skip" | null;
    videoId?: string;
    time?: number;
  };
};

export default function usePlayerControl(roomId: string | null) {
  const { on, off, emit } = useSocket();

  const [state, setState] = useImmer<PlayerControlState>({
    playerState: {
      playing: false,
      currentTime: 0,
      videoId: "",
    },
    isPlaying: false,
    pendingCommand: {
      type: null,
    },
  });

  useEffect(() => {
    const handlePlayerStateUpdate = (...args: unknown[]) => {
      const data = args[0] as PlayerState;
      setState((draft) => {
        draft.playerState = data;
        draft.isPlaying = data.playing;
      });
    };

    const handleCmdPlay = () => {
      setState((draft) => {
        draft.pendingCommand = { type: "play" };
      });
    };

    const handleCmdPause = () => {
      setState((draft) => {
        draft.pendingCommand = { type: "pause" };
      });
    };

    const handleCmdSeek = (...args: unknown[]) => {
      const data = args[0] as { time: number };
      setState((draft) => {
        draft.pendingCommand = { type: "seek", time: data.time };
      });
    };

    const handleCmdSkip = (...args: unknown[]) => {
      const data = args[0] as { videoId: string } | null;
      if (!data?.videoId) return;
      setState((draft) => {
        draft.pendingCommand = { type: "skip", videoId: data.videoId };
      });
    };

    on("player-state-update", handlePlayerStateUpdate);
    on("cmd-play", handleCmdPlay);
    on("cmd-pause", handleCmdPause);
    on("cmd-seek", handleCmdSeek);
    on("cmd-skip", handleCmdSkip);

    return () => {
      off("player-state-update", handlePlayerStateUpdate);
      off("cmd-play", handleCmdPlay);
      off("cmd-pause", handleCmdPause);
      off("cmd-seek", handleCmdSeek);
      off("cmd-skip", handleCmdSkip);
    };
  }, [on, off, setState]);

  const play = useCallback(() => {
    if (!roomId) return;
    emit("play", { roomId });
  }, [roomId, emit]);

  const pause = useCallback(() => {
    if (!roomId) return;
    emit("pause", { roomId });
  }, [roomId, emit]);

  const seek = useCallback(
    (time: number) => {
      if (!roomId) return;
      emit("seek", { roomId, time });
    },
    [roomId, emit],
  );

  const skip = useCallback(() => {
    if (!roomId) return;
    emit("skip", { roomId });
  }, [roomId, emit]);

  const clearPendingCommand = useCallback(() => {
    setState((draft) => {
      draft.pendingCommand = { type: null };
    });
  }, [setState]);

  return {
    playerState: state.playerState,
    isPlaying: state.isPlaying,
    pendingCommand: state.pendingCommand,
    play,
    pause,
    seek,
    skip,
    clearPendingCommand,
  };
}
