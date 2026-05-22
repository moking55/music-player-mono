"use client";

import { useCallback, useEffect } from "react";
import { useImmer } from "use-immer";
import useSocket from "@/hooks/use-socket";

type DanmuItem = {
  id: number;
  text: string;
  lane: number;
};

type UseDanmuOptions = {
  mode: "send" | "receive";
};

export default function useDanmu(
  roomId: string | null,
  options: UseDanmuOptions = { mode: "send" },
) {
  const { on, off, emit } = useSocket();

  const [state, setState] = useImmer<{
    danmuList: DanmuItem[];
    nextId: number;
  }>({
    danmuList: [],
    nextId: 0,
  });

  useEffect(() => {
    if (options.mode !== "receive") return;

    const handleDanmu = (...args: unknown[]) => {
      const data = args[0] as { text: string };
      setState((draft) => {
        const lane = Math.floor(Math.random() * 10);
        draft.danmuList.push({
          id: draft.nextId,
          text: data.text,
          lane,
        });
        draft.nextId += 1;
      });
    };

    on("danmu", handleDanmu);

    return () => {
      off("danmu", handleDanmu);
    };
  }, [options.mode, on, off, setState]);

  const sendDanmu = useCallback(
    (text: string) => {
      if (!roomId || !text.trim()) return;
      emit("send-danmu", { roomId, text: text.trim() });
    },
    [roomId, emit],
  );

  const removeDanmu = useCallback(
    (id: number) => {
      setState((draft) => {
        draft.danmuList = draft.danmuList.filter((item: DanmuItem) => item.id !== id);
      });
    },
    [setState],
  );

  if (options.mode === "receive") {
    return {
      danmuList: state.danmuList,
      removeDanmu,
      sendDanmu: undefined as undefined,
    };
  }

  return {
    danmuList: [] as DanmuItem[],
    removeDanmu: undefined as undefined,
    sendDanmu,
  };
}
