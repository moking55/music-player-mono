import type { VideoItem } from 'shared-types';

export interface PlayerState {
  playing: boolean;
  currentTime: number;
  videoId: string;
}

export interface InternalRoom {
  roomId: string;
  hostSocketId: string;
  clientCount: number;
  queue: VideoItem[];
  currentIndex: number;
  playerState: PlayerState;
  forcePlayed: boolean;
}

export interface IRoomRepository {
  createRoom(roomId: string, hostSocketId: string): Promise<void>;
  getRoom(roomId: string): Promise<InternalRoom | null>;
  deleteRoom(roomId: string): Promise<void>;
  joinRoom(roomId: string, clientSocketId: string): Promise<void>;
  leaveRoom(roomId: string, clientSocketId: string): Promise<void>;
  addToQueue(roomId: string, item: VideoItem): Promise<void>;
  acquireQueueLock(roomId: string, token: string, ttlMs: number): Promise<boolean>;
  releaseQueueLock(roomId: string, token: string): Promise<void>;
  getQueue(roomId: string): Promise<VideoItem[]>;
  setQueue(roomId: string, queue: VideoItem[]): Promise<void>;
  updatePlayerState(roomId: string, state: PlayerState): Promise<void>;
  getPlayerState(roomId: string): Promise<PlayerState>;
  getCurrentIndex(roomId: string): Promise<number>;
  setCurrentIndex(roomId: string, index: number): Promise<void>;
  getRoomIdBySocket(socketId: string): Promise<string | null>;
  setSocketRoomMapping(socketId: string, roomId: string): Promise<void>;
  removeSocketMapping(socketId: string): Promise<void>;
  getRoomIdByHost(hostSocketId: string): Promise<string | null>;
  setHostRoomMapping(hostSocketId: string, roomId: string): Promise<void>;
  removeHostMapping(hostSocketId: string): Promise<void>;
  clearHostSocketId(roomId: string): Promise<void>;
  updateHostSocketId(roomId: string, newHostSocketId: string): Promise<void>;
  getClientCount(roomId: string): Promise<number>;
  incrementClientCount(roomId: string): Promise<number>;
  decrementClientCount(roomId: string): Promise<number>;
  setForcePlayed(roomId: string, forcePlayed: boolean): Promise<void>;
  refreshTTL(roomId: string): Promise<void>;
}
