export type TabNavigationProps = {
  activeTab: "queue" | "danmu" | "meme";
  onTabChange: (tab: "queue" | "danmu" | "meme") => void;
};
