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
  hostDisconnected: boolean;
  error: string | null;
};

export default function useWatchRoom() {
  const { connected, on, off, emit } = useSocket();
  const router = useRouter();

  const [state, setState] = useImmer<WatchRoomState>({
    roomId: null,
    roomData: null,
    isHost: false,
    hostDisconnected: false,
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
        draft.hostDisconnected = false;
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
        draft.hostDisconnected = true;
        draft.error = null;
      });
    };

    const handleHostReconnected = () => {
      setState((draft) => {
        draft.hostDisconnected = false;
        draft.error = null;
      });
    };

    on("room-joined", handleRoomJoined);
    on("room-not-found", handleRoomNotFound);
    on("room-destroyed", handleRoomDestroyed);
    on("host-disconnected", handleHostDisconnected);
    on("host-reconnected", handleHostReconnected);

    return () => {
      off("room-joined", handleRoomJoined);
      off("room-not-found", handleRoomNotFound);
      off("room-destroyed", handleRoomDestroyed);
      off("host-disconnected", handleHostDisconnected);
      off("host-reconnected", handleHostReconnected);
    };
  }, [on, off, setState]);

  useEffect(() => {
    if (state.roomId && state.isHost && !state.hostDisconnected) {
      router.push(`/watch/host?room=${state.roomId}`);
    }
  }, [state.roomId, state.isHost, state.hostDisconnected, router]);

  const createRoom = useCallback(() => {
    setState((draft) => {
      draft.error = null;
      draft.isHost = true;
      draft.hostDisconnected = false;
    });
    emit("create-room");
  }, [emit, setState]);

  const joinRoom = useCallback(
    (roomId: string) => {
      setState((draft) => {
        draft.error = null;
        draft.isHost = false;
        draft.hostDisconnected = false;
      });
      emit("join-room", { roomId });
    },
    [emit, setState],
  );

  const reconnectHost = useCallback(
    (roomId: string) => {
      emit("reconnect-host", { roomId });
    },
    [emit],
  );

  const leaveRoom = useCallback(() => {
    setState((draft) => {
      draft.roomId = null;
      draft.roomData = null;
      draft.isHost = false;
      draft.hostDisconnected = false;
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
    hostDisconnected: state.hostDisconnected,
    error: state.error,
    createRoom,
    joinRoom,
    reconnectHost,
    leaveRoom,
    navigateToHost,
    navigateToClient,
  };
}
