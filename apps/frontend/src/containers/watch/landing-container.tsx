"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Wifi, WifiOff } from "lucide-react";
import { useWatchRoom } from "@/hooks/use-watch-room";

export default function LandingContainer() {
  const { createRoom, navigateToClient, connected, error } = useWatchRoom();
  const [joinCode, setJoinCode] = useState("");

  const handleCreateRoom = useCallback(() => {
    createRoom();
  }, [createRoom]);

  const handleJoinRoom = useCallback(() => {
    if (!joinCode.trim()) return;
    navigateToClient(joinCode.trim().toUpperCase());
  }, [joinCode, navigateToClient]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent" />

      <div className="relative z-10 w-full max-w-md mx-4">
        {error && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300">
            <AlertCircle size={16} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <Card className="border-gray-700 bg-gray-900/80 backdrop-blur-xl shadow-2xl shadow-purple-900/10">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Watch Together
            </CardTitle>
            <p className="text-gray-400 mt-1 text-sm">
              Watch videos together with friends in real-time
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 pt-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              {connected ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-900/40 text-green-400 text-xs font-medium">
                  <Wifi size={12} />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-900/40 text-red-400 text-xs font-medium">
                  <WifiOff size={12} />
                  Connecting...
                </span>
              )}
            </div>

            <Button
              onClick={handleCreateRoom}
              disabled={!connected}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
              size="lg"
            >
              Create Room
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-900 px-3 text-gray-500">or join existing</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="ROOM CODE"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="flex-1 h-12 text-center text-lg tracking-widest uppercase bg-gray-800 border-gray-600 text-white placeholder:text-gray-600"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleJoinRoom();
                }}
              />
              <Button
                onClick={handleJoinRoom}
                disabled={!joinCode.trim() || !connected}
                variant="secondary"
                className="h-12 px-6"
              >
                Join
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
