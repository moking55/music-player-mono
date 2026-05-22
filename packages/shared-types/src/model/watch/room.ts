export interface VideoItem {
  videoId: string;
  title: string;
  thumbnail: string;
  addedBy?: string;
}

export interface PlayerStateData {
  playing: boolean;
  currentTime: number;
  videoId: string;
}

export interface RoomData {
  roomId: string;
  queue: VideoItem[];
  currentIndex: number;
  playerState: PlayerStateData;
  clientCount: number;
}
