"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { Socket, io } from "socket.io-client";

export type SocketContextType = {
  socket: Socket | null;
  connected: boolean;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
  emit: (event: string, data?: unknown) => void;
};

export const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  on: () => {},
  off: () => {},
  emit: () => {},
});

type SocketProviderProps = {
  children: React.ReactNode;
};

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    const newSocket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      transports: ["websocket", "polling"],
    });

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    newSocket.on("connect", handleConnect);
    newSocket.on("disconnect", handleDisconnect);
    setSocket(newSocket);

    return () => {
      newSocket.off("connect", handleConnect);
      newSocket.off("disconnect", handleDisconnect);
      newSocket.disconnect();
    };
  }, []);

  const on = useCallback(
    (event: string, callback: (...args: unknown[]) => void) => {
      socket?.on(event, callback);
    },
    [socket],
  );

  const off = useCallback(
    (event: string, callback: (...args: unknown[]) => void) => {
      socket?.off(event, callback);
    },
    [socket],
  );

  const emit = useCallback(
    (event: string, data?: unknown) => {
      socket?.emit(event, data);
    },
    [socket],
  );

  const value = useMemo(
    () => ({ socket, connected, on, off, emit }),
    [socket, connected, on, off, emit],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}
