export type ClientContainerProps = Record<string, never>;

export type ClientState = {
  activeTab: "queue" | "danmu" | "meme" | "poll";
  isReady: boolean;
};
