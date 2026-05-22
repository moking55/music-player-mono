export type DanmuOverlayProps = {
  danmuList: Array<{ id: number; text: string; lane: number }>;
  onRemove?: (id: number) => void;
};
