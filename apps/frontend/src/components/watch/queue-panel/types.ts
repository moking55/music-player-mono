import type { VideoItem } from "shared-types";

export type QueuePanelProps = {
  queue: VideoItem[];
  currentIndex: number;
  onForcePlay?: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onRemove?: (index: number) => void;
};
