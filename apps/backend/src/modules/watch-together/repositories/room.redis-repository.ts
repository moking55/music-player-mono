import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

import type {
  IRoomRepository,
  InternalRoom,
  PlayerState,
} from './room.repository.interface';
import type { VideoItem } from 'shared-types';

const roomTtl = 3600;

@Injectable()
export class RoomRedisRepository implements IRoomRepository {
  private readonly logger = new Logger(RoomRedisRepository.name);

  constructor(private readonly redis: Redis) {}

  private roomKey(roomId: string) {
    return `wt:room:${roomId}`;
  }

  private queueKey(roomId: string) {
    return `wt:queue:${roomId}`;
  }

  private async setTTL(roomId: string) {
    const pipeline = this.redis.pipeline();
    pipeline.expire(this.roomKey(roomId), roomTtl);
    pipeline.expire(this.queueKey(roomId), roomTtl);
    await pipeline.exec();
  }

  async createRoom(roomId: string, hostSocketId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.hset(this.roomKey(roomId), {
      hostSocketId,
      currentIndex: '-1',
      playerState: JSON.stringify({
        playing: false,
        currentTime: 0,
        videoId: '',
      }),
      forcePlayed: 'false',
    });
    pipeline.expire(this.roomKey(roomId), roomTtl);
    pipeline.hset('wt:host-map', hostSocketId, roomId);
    pipeline.expire('wt:host-map', roomTtl * 2);
    await pipeline.exec();
    this.logger.debug(`Room created in Redis: ${roomId}`);
  }

  async getRoom(roomId: string): Promise<InternalRoom | null> {
    const pipeline = this.redis.pipeline();
    pipeline.hgetall(this.roomKey(roomId));
    pipeline.lrange(this.queueKey(roomId), 0, -1);
    pipeline.scard(`wt:clients:${roomId}`);

    const results = await pipeline.exec();
    if (!results) {
      return null;
    }

    const roomData = results[0][1] as Record<string, string> | null;
    if (!roomData || Object.keys(roomData).length === 0) {
      return null;
    }

    const queueJson = results[1][1] as string[];
    const clientCount = results[2][1] as number;

    return {
      roomId,
      hostSocketId: roomData.hostSocketId,
      clientCount: clientCount ?? 0,
      queue: queueJson.map((item) => JSON.parse(item) as VideoItem),
      currentIndex: parseInt(roomData.currentIndex, 10),
      playerState: JSON.parse(roomData.playerState) as PlayerState,
      forcePlayed: roomData.forcePlayed === 'true',
    };
  }

  async deleteRoom(roomId: string): Promise<void> {
    const roomData = await this.redis.hgetall(this.roomKey(roomId));
    const pipeline = this.redis.pipeline();
    pipeline.del(this.roomKey(roomId));
    pipeline.del(this.queueKey(roomId));
    pipeline.del(`wt:clients:${roomId}`);
    if (roomData.hostSocketId) {
      pipeline.hdel('wt:host-map', roomData.hostSocketId);
    }
    await pipeline.exec();
    this.logger.debug(`Room deleted from Redis: ${roomId}`);
  }

  async joinRoom(roomId: string, clientSocketId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.sadd(`wt:clients:${roomId}`, clientSocketId);
    pipeline.hset('wt:socket-map', clientSocketId, roomId);
    pipeline.expire(`wt:clients:${roomId}`, roomTtl);
    await pipeline.exec();
    await this.refreshTTL(roomId);
  }

  async leaveRoom(roomId: string, clientSocketId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.srem(`wt:clients:${roomId}`, clientSocketId);
    pipeline.hdel('wt:socket-map', clientSocketId);
    await pipeline.exec();
    await this.refreshTTL(roomId);
  }

  async addToQueue(roomId: string, item: VideoItem): Promise<void> {
    await this.redis.rpush(this.queueKey(roomId), JSON.stringify(item));
    await this.refreshTTL(roomId);
  }

  async getQueue(roomId: string): Promise<VideoItem[]> {
    const items = await this.redis.lrange(this.queueKey(roomId), 0, -1);
    return items.map((item) => JSON.parse(item) as VideoItem);
  }

  async setQueue(roomId: string, queue: VideoItem[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.del(this.queueKey(roomId));
    if (queue.length > 0) {
      pipeline.rpush(
        this.queueKey(roomId),
        ...queue.map((item) => JSON.stringify(item)),
      );
    }
    await pipeline.exec();
    await this.refreshTTL(roomId);
  }

  async updatePlayerState(roomId: string, state: PlayerState): Promise<void> {
    await this.redis.hset(
      this.roomKey(roomId),
      'playerState',
      JSON.stringify(state),
    );
    await this.refreshTTL(roomId);
  }

  async getPlayerState(roomId: string): Promise<PlayerState> {
    const state = await this.redis.hget(this.roomKey(roomId), 'playerState');
    return state
      ? (JSON.parse(state) as PlayerState)
      : { playing: false, currentTime: 0, videoId: '' };
  }

  async getCurrentIndex(roomId: string): Promise<number> {
    const index = await this.redis.hget(this.roomKey(roomId), 'currentIndex');
    return index ? parseInt(index, 10) : -1;
  }

  async setCurrentIndex(roomId: string, index: number): Promise<void> {
    await this.redis.hset(this.roomKey(roomId), 'currentIndex', String(index));
    await this.refreshTTL(roomId);
  }

  async getRoomIdBySocket(socketId: string): Promise<string | null> {
    return this.redis.hget('wt:socket-map', socketId);
  }

  async setSocketRoomMapping(socketId: string, roomId: string): Promise<void> {
    await this.redis.hset('wt:socket-map', socketId, roomId);
  }

  async removeSocketMapping(socketId: string): Promise<void> {
    await this.redis.hdel('wt:socket-map', socketId);
  }

  async getRoomIdByHost(hostSocketId: string): Promise<string | null> {
    return this.redis.hget('wt:host-map', hostSocketId);
  }

  async setHostRoomMapping(
    hostSocketId: string,
    roomId: string,
  ): Promise<void> {
    await this.redis.hset('wt:host-map', hostSocketId, roomId);
  }

  async removeHostMapping(hostSocketId: string): Promise<void> {
    await this.redis.hdel('wt:host-map', hostSocketId);
  }

  async clearHostSocketId(roomId: string): Promise<void> {
    await this.redis.hset(this.roomKey(roomId), 'hostSocketId', '');
  }

  async updateHostSocketId(
    roomId: string,
    newHostSocketId: string,
  ): Promise<void> {
    const oldHostId = await this.redis.hget(
      this.roomKey(roomId),
      'hostSocketId',
    );
    const pipeline = this.redis.pipeline();
    pipeline.hset(this.roomKey(roomId), 'hostSocketId', newHostSocketId);
    if (oldHostId) {
      pipeline.hdel('wt:host-map', oldHostId);
    }
    pipeline.hset('wt:host-map', newHostSocketId, roomId);
    await pipeline.exec();
    await this.refreshTTL(roomId);
  }

  async getClientCount(roomId: string): Promise<number> {
    return this.redis.scard(`wt:clients:${roomId}`);
  }

  async incrementClientCount(roomId: string): Promise<number> {
    await this.refreshTTL(roomId);
    return this.redis.scard(`wt:clients:${roomId}`);
  }

  async decrementClientCount(roomId: string): Promise<number> {
    await this.refreshTTL(roomId);
    return this.redis.scard(`wt:clients:${roomId}`);
  }

  async setForcePlayed(roomId: string, forcePlayed: boolean): Promise<void> {
    await this.redis.hset(
      this.roomKey(roomId),
      'forcePlayed',
      String(forcePlayed),
    );
    await this.refreshTTL(roomId);
  }

  async refreshTTL(roomId: string): Promise<void> {
    await this.setTTL(roomId);
  }
}
