export type PlaybackControlsProps = {
  isPlaying: boolean;
  currentTime: number;
  videoId: string;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
};
