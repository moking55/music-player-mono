"use client";

import { useCallback, useEffect } from "react";
import { useImmer } from "use-immer";
import { useRouter } from "next/navigation";
import useSocket from "@/hooks/use-socket";

import type { RoomData } from "shared-types";

type WatchRoomState = {
  roomId: string | null;
  roomData: RoomData | null;
  isHost: boolean;
  error: string | null;
};

export default function useWatchRoom() {
  const { connected, on, off, emit } = useSocket();
  const router = useRouter();

  const [state, setState] = useImmer<WatchRoomState>({
    roomId: null,
    roomData: null,
    isHost: false,
    error: null,
  });

  useEffect(() => {
    const handleRoomJoined = (...args: unknown[]) => {
      const data = args[0] as RoomData & { isHost?: boolean };
      setState((draft) => {
        draft.roomId = data.roomId;
        draft.roomData = data;
        draft.isHost = data.isHost ?? draft.isHost;
        draft.error = null;
      });
    };

    const handleRoomNotFound = (...args: unknown[]) => {
      const data = args[0] as { roomId: string };
      setState((draft) => {
        draft.error = `Room ${data.roomId} not found`;
      });
    };

    const handleRoomDestroyed = (...args: unknown[]) => {
      const data = args[0] as { roomId: string };
      setState((draft) => {
        draft.error = `Room ${data.roomId} has been destroyed`;
        draft.roomId = null;
        draft.roomData = null;
      });
    };

    const handleHostDisconnected = () => {
      setState((draft) => {
        draft.error = "Host disconnected. Waiting for reconnection...";
      });
    };

    on("room-joined", handleRoomJoined);
    on("room-not-found", handleRoomNotFound);
    on("room-destroyed", handleRoomDestroyed);
    on("host-disconnected", handleHostDisconnected);

    return () => {
      off("room-joined", handleRoomJoined);
      off("room-not-found", handleRoomNotFound);
      off("room-destroyed", handleRoomDestroyed);
      off("host-disconnected", handleHostDisconnected);
    };
  }, [on, off, setState]);

  useEffect(() => {
    if (state.roomId && state.isHost) {
      router.push(`/watch/host?room=${state.roomId}`);
    }
  }, [state.roomId, state.isHost, router]);

  const createRoom = useCallback(() => {
    setState((draft) => {
      draft.error = null;
      draft.isHost = true;
    });
    emit("create-room");
  }, [emit, setState]);

  const joinRoom = useCallback(
    (roomId: string) => {
      setState((draft) => {
        draft.error = null;
        draft.isHost = false;
      });
      emit("join-room", { roomId });
    },
    [emit, setState],
  );

  const leaveRoom = useCallback(() => {
    setState((draft) => {
      draft.roomId = null;
      draft.roomData = null;
      draft.isHost = false;
      draft.error = null;
    });
  }, [setState]);

  const navigateToHost = useCallback(
    (roomId: string) => {
      router.push(`/watch/host?room=${roomId}`);
    },
    [router],
  );

  const navigateToClient = useCallback(
    (roomId: string) => {
      router.push(`/watch/client?room=${roomId}`);
    },
    [router],
  );

  return {
    connected,
    roomId: state.roomId,
    roomData: state.roomData,
    isHost: state.isHost,
    error: state.error,
    createRoom,
    joinRoom,
    leaveRoom,
    navigateToHost,
    navigateToClient,
  };
}
