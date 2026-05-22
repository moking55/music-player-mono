import type { VideoItem } from 'shared-types';

export interface InternalRoom {
  roomId: string;
  hostSocketId: string;
  clients: Set<string>;
  queue: VideoItem[];
  currentIndex: number;
  playerState: {
    playing: boolean;
    currentTime: number;
    videoId: string;
  };
}
