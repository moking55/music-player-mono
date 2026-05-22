import { Injectable, Logger } from '@nestjs/common';

import type {
  IRoomRepository,
  InternalRoom,
  PlayerState,
} from './room.repository.interface';
import type { VideoItem } from 'shared-types';

@Injectable()
export class RoomMemoryRepository implements IRoomRepository {
  private readonly logger = new Logger(RoomMemoryRepository.name);
  private readonly rooms = new Map<string, InternalRoom>();
  private readonly socketToRoom = new Map<string, string>();
  private readonly hostToRoom = new Map<string, string>();

  async createRoom(roomId: string, hostSocketId: string): Promise<void> {
    this.rooms.set(roomId, {
      roomId,
      hostSocketId,
      clientCount: 0,
      queue: [],
      currentIndex: -1,
      playerState: {
        playing: false,
        currentTime: 0,
        videoId: '',
      },
    });
    this.hostToRoom.set(hostSocketId, roomId);
    this.logger.debug(`Room created in memory: ${roomId}`);
  }

  async getRoom(roomId: string): Promise<InternalRoom | null> {
    return this.rooms.get(roomId) ?? null;
  }

  async deleteRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      this.hostToRoom.delete(room.hostSocketId);
    }
    this.rooms.delete(roomId);
    this.logger.debug(`Room deleted from memory: ${roomId}`);
  }

  async joinRoom(roomId: string, clientSocketId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.clientCount += 1;
    }
    this.socketToRoom.set(clientSocketId, roomId);
  }

  async leaveRoom(roomId: string, clientSocketId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.clientCount = Math.max(0, room.clientCount - 1);
    }
    this.socketToRoom.delete(clientSocketId);
  }

  async addToQueue(roomId: string, item: VideoItem): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.queue.push(item);
    }
  }

  async getQueue(roomId: string): Promise<VideoItem[]> {
    return this.rooms.get(roomId)?.queue ?? [];
  }

  async setQueue(roomId: string, queue: VideoItem[]): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.queue = queue;
    }
  }

  async updatePlayerState(roomId: string, state: PlayerState): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.playerState = state;
    }
  }

  async getPlayerState(roomId: string): Promise<PlayerState> {
    return (
      this.rooms.get(roomId)?.playerState ?? {
        playing: false,
        currentTime: 0,
        videoId: '',
      }
    );
  }

  async getCurrentIndex(roomId: string): Promise<number> {
    return this.rooms.get(roomId)?.currentIndex ?? -1;
  }

  async setCurrentIndex(roomId: string, index: number): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.currentIndex = index;
    }
  }

  async getRoomIdBySocket(socketId: string): Promise<string | null> {
    return this.socketToRoom.get(socketId) ?? null;
  }

  async setSocketRoomMapping(socketId: string, roomId: string): Promise<void> {
    this.socketToRoom.set(socketId, roomId);
  }

  async removeSocketMapping(socketId: string): Promise<void> {
    this.socketToRoom.delete(socketId);
  }

  async getRoomIdByHost(hostSocketId: string): Promise<string | null> {
    return this.hostToRoom.get(hostSocketId) ?? null;
  }

  async setHostRoomMapping(
    hostSocketId: string,
    roomId: string,
  ): Promise<void> {
    this.hostToRoom.set(hostSocketId, roomId);
  }

  async removeHostMapping(hostSocketId: string): Promise<void> {
    this.hostToRoom.delete(hostSocketId);
  }

  async clearHostSocketId(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      this.hostToRoom.delete(room.hostSocketId);
      room.hostSocketId = '';
    }
  }

  async updateHostSocketId(
    roomId: string,
    newHostSocketId: string,
  ): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      this.hostToRoom.delete(room.hostSocketId);
      room.hostSocketId = newHostSocketId;
      this.hostToRoom.set(newHostSocketId, roomId);
    }
  }

  async getClientCount(roomId: string): Promise<number> {
    return this.rooms.get(roomId)?.clientCount ?? 0;
  }

  async incrementClientCount(roomId: string): Promise<number> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.clientCount += 1;
    }
    return room?.clientCount ?? 0;
  }

  async decrementClientCount(roomId: string): Promise<number> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.clientCount = Math.max(0, room.clientCount - 1);
    }
    return room?.clientCount ?? 0;
  }

  async refreshTTL(): Promise<void> {
    // No-op for in-memory
  }
}
