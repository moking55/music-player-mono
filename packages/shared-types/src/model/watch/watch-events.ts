export interface JoinRoomPayload {
  roomId: string;
}

export interface AddToQueuePayload {
  roomId: string;
  videoId: string;
  title: string;
  thumbnail: string;
}

export interface SeekPayload {
  roomId: string;
  time: number;
}

export interface SendDanmuPayload {
  roomId: string;
  text: string;
}

export interface SendMemePayload {
  roomId: string;
  imageUrl: string;
}

export interface PlayerStateUpdatePayload {
  playing: boolean;
  currentTime: number;
  videoId: string;
}

export interface ForcePlayPayload {
  roomId: string;
  index: number;
}

export interface ReorderQueuePayload {
  roomId: string;
  fromIndex: number;
  toIndex: number;
}

export interface RemoveFromQueuePayload {
  roomId: string;
  index: number;
}
