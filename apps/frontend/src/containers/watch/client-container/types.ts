export type ClientContainerProps = Record<string, never>;

export type ClientState = {
  activeTab: "queue" | "danmu" | "meme";
  isReady: boolean;
};
