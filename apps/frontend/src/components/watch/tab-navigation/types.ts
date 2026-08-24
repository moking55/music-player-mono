export type TabNavigationProps = {
  activeTab: "queue" | "danmu" | "meme" | "poll";
  onTabChange: (tab: "queue" | "danmu" | "meme" | "poll") => void;
  hasActivePoll?: boolean;
};
