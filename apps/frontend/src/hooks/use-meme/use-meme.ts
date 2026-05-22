"use client";

import { useCallback, useEffect, useRef } from "react";
import { useImmer } from "use-immer";
import useSocket from "@/hooks/use-socket";

type UseMemeOptions = {
  mode: "send" | "receive";
};

export default function useMeme(
  roomId: string | null,
  options: UseMemeOptions = { mode: "send" },
) {
  const { on, off, emit } = useSocket();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useImmer<{
    currentMeme: string | null;
    uploading: boolean;
    error: string | null;
  }>({
    currentMeme: null,
    uploading: false,
    error: null,
  });

  useEffect(() => {
    if (options.mode !== "receive") return;

    const handleMeme = (...args: unknown[]) => {
      const data = args[0] as { imageUrl?: string; base64?: string };
      setState((draft) => {
        draft.currentMeme = data.base64 ?? data.imageUrl ?? null;
        draft.error = null;
      });

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setState((draft) => {
          draft.currentMeme = null;
        });
      }, 5000);
    };

    on("meme", handleMeme);

    return () => {
      off("meme", handleMeme);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [options.mode, on, off, setState]);

  const sendMeme = useCallback(
    async (file: File) => {
      if (!roomId) return;

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setState((draft) => {
          draft.error = "Image must be under 5MB";
        });
        return;
      }

      setState((draft) => {
        draft.uploading = true;
        draft.error = null;
      });

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        emit("send-meme", { roomId, base64 });
      } catch {
        setState((draft) => {
          draft.error = "Failed to process image";
        });
      } finally {
        setState((draft) => {
          draft.uploading = false;
        });
      }
    },
    [roomId, emit, setState],
  );

  const dismissMeme = useCallback(() => {
    setState((draft) => {
      draft.currentMeme = null;
    });
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, [setState]);

  if (options.mode === "receive") {
    return {
      currentMeme: state.currentMeme,
      uploading: false,
      error: null,
      sendMeme: undefined as undefined,
      dismissMeme,
    };
  }

  return {
    currentMeme: null,
    uploading: state.uploading,
    error: state.error,
    sendMeme,
    dismissMeme: undefined as undefined,
  };
}
