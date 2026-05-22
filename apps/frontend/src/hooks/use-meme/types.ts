"use client";

export type UseMemeOptions = {
  mode: "send" | "receive";
};

export type UseMemeReturn = ReturnType<typeof import("./use-meme").default>;
