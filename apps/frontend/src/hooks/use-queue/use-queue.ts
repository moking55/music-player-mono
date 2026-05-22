"use client";

import { useCallback, useEffect } from "react";
import { useImmer } from "use-immer";
import useSocket from "@/hooks/use-socket";

import type { VideoItem } from "shared-types";

type QueueState = {
  queue: VideoItem[];
  currentIndex: number;
};

export default function useQueue(roomId: string | null) {
  const { on, off, emit } = useSocket();

  const [state, setState] = useImmer<QueueState>({
    queue: [],
    currentIndex: -1,
  });

  useEffect(() => {
    const handleQueueUpdated = (...args: unknown[]) => {
      const data = args[0] as { queue: VideoItem[]; currentIndex: number };
      setState((draft) => {
        draft.queue = data.queue;
        draft.currentIndex = data.currentIndex;
      });
    };

    on("queue-updated", handleQueueUpdated);

    return () => {
      off("queue-updated", handleQueueUpdated);
    };
  }, [on, off, setState]);

  const addToQueue = useCallback(
    (videoId: string, title: string, thumbnail: string) => {
      if (!roomId) return;
      emit("add-to-queue", { roomId, videoId, title, thumbnail });
    },
    [roomId, emit],
  );

  const forcePlay = useCallback(
    (index: number) => {
      if (!roomId) return;
      emit("force-play", { roomId, index });
    },
    [roomId, emit],
  );

  const reorderQueue = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!roomId) return;
      emit("reorder-queue", { roomId, fromIndex, toIndex });
    },
    [roomId, emit],
  );

  const removeFromQueue = useCallback(
    (index: number) => {
      if (!roomId) return;
      emit("remove-from-queue", { roomId, index });
    },
    [roomId, emit],
  );

  return {
    queue: state.queue,
    currentIndex: state.currentIndex,
    addToQueue,
    forcePlay,
    reorderQueue,
    removeFromQueue,
  };
}
