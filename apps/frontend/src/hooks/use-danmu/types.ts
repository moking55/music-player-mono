"use client";

export type UseDanmuOptions = {
  mode: "send" | "receive";
};

export type UseDanmuReturn = ReturnType<typeof import("./use-danmu").default>;
