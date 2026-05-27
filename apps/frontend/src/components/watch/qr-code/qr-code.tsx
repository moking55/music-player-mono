"use client";

import { QRCodeSVG } from "qrcode.react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";

type QRCodeProps = {
  roomId: string;
  variant?: "idle" | "playing";
};

export default function QRCode({ roomId, variant = "idle" }: QRCodeProps) {
  const [copied, setCopied] = useState(false);
  const joinUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/watch/client?room=${roomId}`;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  if (variant === "playing") {
    return (
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="bg-black/60 backdrop-blur border-gray-700 p-3">
          <CardContent className="p-0 flex items-center gap-3">
            <QRCodeSVG value={joinUrl} size={96} bgColor="transparent" fgColor="white" />
            <div className="pr-2">
              <p className="text-xs text-gray-400">Join Code</p>
              <p className="text-lg font-mono font-bold text-white tracking-widest">{roomId}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 px-1 text-xs text-gray-400 hover:text-white"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="bg-gray-800/80 backdrop-blur border-gray-700">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <QRCodeSVG value={joinUrl} size={180} bgColor="transparent" fgColor="white" />
        <div className="text-center">
          <p className="text-sm text-gray-400">Join Code</p>
          <p className="text-2xl font-mono font-bold text-white tracking-widest">{roomId}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="border-gray-600 text-gray-300 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" /> Copy Code
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
