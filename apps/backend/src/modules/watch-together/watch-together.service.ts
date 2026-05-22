import { Inject, Injectable, Logger } from '@nestjs/common';

import { IRoomRepository } from './repositories/room.repository.interface';
import { roomRepositoryToken } from './repositories/room.repository.provider';

import type {
  VideoItem,
  RoomData,
  PlayerStateUpdatePayload,
  AddToQueuePayload,
} from 'shared-types';
import type { Server } from 'socket.io';

@Injectable()
export class WatchTogetherService {
  private readonly logger = new Logger(WatchTogetherService.name);
  private server: Server | null = null;

  constructor(
    @Inject(roomRepositoryToken)
    private readonly repository: IRoomRepository,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  generateRoomId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async createRoom(hostSocketId: string): Promise<string> {
    const roomId = this.generateRoomId();
    await this.repository.createRoom(roomId, hostSocketId);
    this.logger.log(`Room created: ${roomId} (host: ${hostSocketId})`);
    return roomId;
  }

  async getRoom(roomId: string) {
    return this.repository.getRoom(roomId);
  }

  async joinRoom(
    roomId: string,
    clientSocketId: string,
  ): Promise<(RoomData & { isHost?: boolean }) | null> {
    const room = await this.repository.getRoom(roomId);
    if (!room) {
      this.logger.warn(`Join failed: room ${roomId} not found`);
      return null;
    }

    const isReconnectHost = !room.hostSocketId;

    if (isReconnectHost) {
      await this.repository.updateHostSocketId(roomId, clientSocketId);
    } else {
      await this.repository.joinRoom(roomId, clientSocketId);
    }

    const updatedRoom = await this.repository.getRoom(roomId);
    if (!updatedRoom) {
      return null;
    }

    this.logger.log(
      `Client ${clientSocketId} joined room ${roomId}${isReconnectHost ? ' (as host)' : ''}`,
    );
    return { ...this.toRoomData(updatedRoom), isHost: isReconnectHost };
  }

  async leaveRoom(roomId: string, clientSocketId: string): Promise<void> {
    await this.repository.leaveRoom(roomId, clientSocketId);
    this.logger.log(`Client ${clientSocketId} left room ${roomId}`);
  }

  async handleHostDisconnect(hostSocketId: string): Promise<string | null> {
    const roomId = await this.repository.getRoomIdByHost(hostSocketId);
    if (roomId) {
      await this.repository.clearHostSocketId(roomId);
      await this.repository.removeHostMapping(hostSocketId);
      this.logger.log(`Host disconnected from room ${roomId}, room preserved`);
      return roomId;
    }
    return null;
  }

  async handleClientDisconnect(
    roomId: string,
    clientSocketId: string,
  ): Promise<void> {
    await this.leaveRoom(roomId, clientSocketId);
  }

  async updatePlayerState(
    roomId: string,
    payload: PlayerStateUpdatePayload,
  ): Promise<void> {
    const room = await this.repository.getRoom(roomId);
    if (!room) {
      return;
    }

    await this.repository.updatePlayerState(roomId, {
      playing: payload.playing,
      currentTime: payload.currentTime,
      videoId: payload.videoId,
    });
  }

  async addToQueue(
    roomId: string,
    payload: AddToQueuePayload,
    addedBy?: string,
  ): Promise<VideoItem[]> {
    const room = await this.repository.getRoom(roomId);
    if (!room) {
      return [];
    }

    const videoItem: VideoItem = {
      videoId: payload.videoId,
      title: payload.title,
      thumbnail: payload.thumbnail,
      addedBy,
    };
    await this.repository.addToQueue(roomId, videoItem);
    this.logger.log(`Video added to queue in room ${roomId}: ${payload.title}`);

    const updatedRoom = await this.repository.getRoom(roomId);
    return updatedRoom?.queue ?? [];
  }

  async getNextVideo(roomId: string): Promise<VideoItem | null> {
    const room = await this.repository.getRoom(roomId);
    if (!room || room.currentIndex < 0 || room.queue.length === 0) {
      return null;
    }

    room.queue.splice(room.currentIndex, 1);

    if (room.queue.length === 0) {
      await this.repository.setQueue(roomId, []);
      await this.repository.setCurrentIndex(roomId, -1);
      this.logger.log(`Queue empty after removing last video in room ${roomId}`);
      return null;
    }

    if (room.currentIndex >= room.queue.length) {
      room.currentIndex = room.queue.length - 1;
    }

    await this.repository.setQueue(roomId, room.queue);
    await this.repository.setCurrentIndex(roomId, room.currentIndex);

    this.logger.log(`Advanced to next video in room ${roomId}`);
    return room.queue[room.currentIndex];
  }

  async getCurrentVideo(roomId: string): Promise<VideoItem | null> {
    const room = await this.repository.getRoom(roomId);
    if (
      !room ||
      room.currentIndex < 0 ||
      room.currentIndex >= room.queue.length
    ) {
      return null;
    }
    return room.queue[room.currentIndex];
  }

  async forcePlayVideo(
    roomId: string,
    index: number,
  ): Promise<VideoItem | null> {
    const room = await this.repository.getRoom(roomId);
    if (!room || index < 0 || index >= room.queue.length) {
      return null;
    }
    await this.repository.setCurrentIndex(roomId, index);
    this.logger.log(`Force play video at index ${index} in room ${roomId}`);
    return room.queue[index];
  }

  async reorderQueue(
    roomId: string,
    fromIndex: number,
    toIndex: number,
  ): Promise<VideoItem[]> {
    const room = await this.repository.getRoom(roomId);
    if (!room || fromIndex < 0 || fromIndex >= room.queue.length) {
      return room?.queue ?? [];
    }
    if (toIndex < 0 || toIndex >= room.queue.length) {
      return room.queue;
    }

    const [movedItem] = room.queue.splice(fromIndex, 1);
    room.queue.splice(toIndex, 0, movedItem);

    if (room.currentIndex === fromIndex) {
      room.currentIndex = toIndex;
    } else if (fromIndex < room.currentIndex && toIndex >= room.currentIndex) {
      room.currentIndex -= 1;
    } else if (fromIndex > room.currentIndex && toIndex <= room.currentIndex) {
      room.currentIndex += 1;
    }

    await this.repository.setQueue(roomId, room.queue);
    await this.repository.setCurrentIndex(roomId, room.currentIndex);

    this.logger.log(
      `Reordered queue in room ${roomId}: ${fromIndex} -> ${toIndex}`,
    );
    return room.queue;
  }

  async removeFromQueue(roomId: string, index: number): Promise<VideoItem[]> {
    const room = await this.repository.getRoom(roomId);
    if (!room || index < 0 || index >= room.queue.length) {
      return room?.queue ?? [];
    }

    room.queue.splice(index, 1);

    if (room.currentIndex === index) {
      if (room.queue.length === 0) {
        room.currentIndex = -1;
      } else if (room.currentIndex >= room.queue.length) {
        room.currentIndex = room.queue.length - 1;
      }
    } else if (index < room.currentIndex) {
      room.currentIndex -= 1;
    }

    await this.repository.setQueue(roomId, room.queue);
    await this.repository.setCurrentIndex(roomId, room.currentIndex);

    this.logger.log(
      `Removed video at index ${index} from queue in room ${roomId}`,
    );
    return room.queue;
  }

  toRoomData(room: Awaited<ReturnType<IRoomRepository['getRoom']>>): RoomData {
    if (!room) {
      return {
        roomId: '',
        queue: [],
        currentIndex: -1,
        playerState: { playing: false, currentTime: 0, videoId: '' },
        clientCount: 0,
      };
    }
    return {
      roomId: room.roomId,
      queue: room.queue,
      currentIndex: room.currentIndex,
      playerState: room.playerState,
      clientCount: room.clientCount,
    };
  }

  broadcastToRoom(roomId: string, event: string, data: unknown): void {
    if (!this.server) {
      return;
    }
    this.server.to(roomId).emit(event, data);
  }

  sendToHost(hostSocketId: string, event: string, data: unknown): void {
    if (!this.server) {
      return;
    }
    this.server.to(hostSocketId).emit(event, data);
  }

  async getRoomIdByClient(clientSocketId: string): Promise<string | null> {
    return this.repository.getRoomIdBySocket(clientSocketId);
  }

  async getRoomIdByHost(hostSocketId: string): Promise<string | null> {
    return this.repository.getRoomIdByHost(hostSocketId);
  }
}
