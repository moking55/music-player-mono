export type VideoSearchProps = {
  roomId: string;
  queue: Array<{ videoId: string; title: string; thumbnail: string }>;
  currentIndex: number;
  onAddToQueue: (videoId: string, title: string, thumbnail: string) => void;
  onForcePlay?: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onRemove?: (index: number) => void;
};

export type VideoSearchState = {
  query: string;
};
