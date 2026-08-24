import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { IRoomRepository } from './repositories/room.repository.interface';
import { roomRepositoryToken } from './repositories/room.repository.provider';

import type {
  VideoItem,
  RoomData,
  PlayerStateUpdatePayload,
  AddToQueuePayload,
} from 'shared-types';
import type { Server } from 'socket.io';

type QueueState = {
  queue: VideoItem[];
  currentIndex: number;
  hostSocketId: string;
};

type AddToQueueResult = QueueState & {
  firstVideo: VideoItem | null;
};

type QueueCommandResult = QueueState & {
  video: VideoItem | null;
};

type RemoveQueueResult = QueueState & {
  removedCurrent: boolean;
};

@Injectable()
export class WatchTogetherService {
  private readonly logger = new Logger(WatchTogetherService.name);
  private server: Server | null = null;
  private readonly queueLocks = new Map<string, Promise<void>>();

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

    await this.repository.joinRoom(roomId, clientSocketId);

    const updatedRoom = await this.repository.getRoom(roomId);
    if (!updatedRoom) {
      return null;
    }

    this.logger.log(`Client ${clientSocketId} joined room ${roomId}`);
    return this.toRoomData(updatedRoom);
  }

  async reconnectHost(
    roomId: string,
    hostSocketId: string,
  ): Promise<boolean> {
    const room = await this.repository.getRoom(roomId);
    if (!room) {
      return false;
    }

    await this.repository.updateHostSocketId(roomId, hostSocketId);
    this.logger.log(`Host reconnected to room ${roomId}: ${hostSocketId}`);
    return true;
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

  async isSocketInRoom(roomId: string, socketId: string): Promise<boolean> {
    const [clientRoomId, hostRoomId] = await Promise.all([
      this.repository.getRoomIdBySocket(socketId),
      this.repository.getRoomIdByHost(socketId),
    ]);
    return clientRoomId === roomId || hostRoomId === roomId;
  }

  private async withQueueLock<T>(
    roomId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = this.queueLocks.get(roomId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.queueLocks.set(roomId, queued);

    await previous;
    const lockToken = randomUUID();
    let lockAcquired = false;
    try {
      while (
        !(await this.repository.acquireQueueLock(roomId, lockToken, 10_000))
      ) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      lockAcquired = true;
      return await operation();
    } finally {
      try {
        if (lockAcquired) {
          await this.repository.releaseQueueLock(roomId, lockToken);
        }
      } finally {
        release();
        if (this.queueLocks.get(roomId) === queued) {
          this.queueLocks.delete(roomId);
        }
      }
    }
  }

  async addToQueue(
    roomId: string,
    payload: AddToQueuePayload,
    addedBy?: string,
  ): Promise<AddToQueueResult | null> {
    return this.withQueueLock(roomId, async () => {
      const room = await this.repository.getRoom(roomId);
      if (!room) {
        return null;
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
      if (!updatedRoom) {
        return null;
      }

      let firstVideo: VideoItem | null = null;
      if (updatedRoom.currentIndex === -1 && updatedRoom.queue.length > 0) {
        updatedRoom.currentIndex = 0;
        firstVideo = updatedRoom.queue[0];
        await this.repository.setCurrentIndex(roomId, 0);
        await this.repository.setForcePlayed(roomId, true);
      }

      return {
        queue: updatedRoom.queue,
        currentIndex: updatedRoom.currentIndex,
        hostSocketId: updatedRoom.hostSocketId,
        firstVideo,
      };
    });
  }

  async getNextVideo(roomId: string): Promise<QueueCommandResult | null> {
    return this.withQueueLock(roomId, async () => {
      const room = await this.repository.getRoom(roomId);
      if (!room || room.currentIndex < 0 || room.queue.length === 0) {
        return null;
      }

      room.queue.splice(room.currentIndex, 1);

      if (room.queue.length === 0) {
        await this.repository.setQueue(roomId, []);
        await this.repository.setCurrentIndex(roomId, -1);
        await this.repository.setForcePlayed(roomId, false);
        this.logger.log(`Queue empty after removing last video in room ${roomId}`);
        return {
          queue: [],
          currentIndex: -1,
          hostSocketId: room.hostSocketId,
          video: null,
        };
      }

      if (room.forcePlayed) {
        room.currentIndex = 0;
        await this.repository.setQueue(roomId, room.queue);
        await this.repository.setCurrentIndex(roomId, 0);
        await this.repository.setForcePlayed(roomId, false);
        this.logger.log(`Force-played video ended, reset to index 0 in room ${roomId}`);
        return {
          queue: room.queue,
          currentIndex: room.currentIndex,
          hostSocketId: room.hostSocketId,
          video: room.queue[0],
        };
      }

      if (room.currentIndex >= room.queue.length) {
        room.currentIndex = room.queue.length - 1;
      }

      await this.repository.setQueue(roomId, room.queue);
      await this.repository.setCurrentIndex(roomId, room.currentIndex);

      this.logger.log(`Advanced to next video in room ${roomId}`);
      return {
        queue: room.queue,
        currentIndex: room.currentIndex,
        hostSocketId: room.hostSocketId,
        video: room.queue[room.currentIndex],
      };
    });
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
  ): Promise<QueueCommandResult | null> {
    return this.withQueueLock(roomId, async () => {
      const room = await this.repository.getRoom(roomId);
      if (!room || index < 0 || index >= room.queue.length) {
        return null;
      }
      await this.repository.setCurrentIndex(roomId, index);
      await this.repository.setForcePlayed(roomId, true);
      this.logger.log(`Force play video at index ${index} in room ${roomId}`);
      return {
        queue: room.queue,
        currentIndex: index,
        hostSocketId: room.hostSocketId,
        video: room.queue[index],
      };
    });
  }

  async reorderQueue(
    roomId: string,
    fromIndex: number,
    toIndex: number,
  ): Promise<QueueState | null> {
    return this.withQueueLock(roomId, async () => {
      const room = await this.repository.getRoom(roomId);
      if (!room || fromIndex < 0 || fromIndex >= room.queue.length) {
        return room
          ? {
              queue: room.queue,
              currentIndex: room.currentIndex,
              hostSocketId: room.hostSocketId,
            }
          : null;
      }
      if (toIndex < 0 || toIndex >= room.queue.length) {
        return {
          queue: room.queue,
          currentIndex: room.currentIndex,
          hostSocketId: room.hostSocketId,
        };
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
      return {
        queue: room.queue,
        currentIndex: room.currentIndex,
        hostSocketId: room.hostSocketId,
      };
    });
  }

  async removeFromQueue(
    roomId: string,
    index: number,
  ): Promise<RemoveQueueResult | null> {
    return this.withQueueLock(roomId, async () => {
      const room = await this.repository.getRoom(roomId);
      if (!room || index < 0 || index >= room.queue.length) {
        return room
          ? {
              queue: room.queue,
              currentIndex: room.currentIndex,
              hostSocketId: room.hostSocketId,
              removedCurrent: false,
            }
          : null;
      }

      if (room.currentIndex === index) {
        return {
          queue: room.queue,
          currentIndex: room.currentIndex,
          hostSocketId: room.hostSocketId,
          removedCurrent: false,
        };
      }

      room.queue.splice(index, 1);

      if (index < room.currentIndex) {
        room.currentIndex -= 1;
      }

      await this.repository.setQueue(roomId, room.queue);
      await this.repository.setCurrentIndex(roomId, room.currentIndex);

      this.logger.log(
        `Removed video at index ${index} from queue in room ${roomId}`,
      );
      return {
        queue: room.queue,
        currentIndex: room.currentIndex,
        hostSocketId: room.hostSocketId,
        removedCurrent: false,
      };
    });
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
