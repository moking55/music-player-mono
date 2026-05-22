import Redis from 'ioredis';

import { RedisService } from '../../../redis/redis.service';

import { RoomMemoryRepository } from './room.memory-repository';
import { RoomRedisRepository } from './room.redis-repository';

import type { IRoomRepository } from './room.repository.interface';
import type { FactoryProvider } from '@nestjs/common';

export const roomRepositoryToken = 'IRoomRepository';

export const roomRepositoryProvider: FactoryProvider<IRoomRepository> = {
  provide: roomRepositoryToken,
  inject: [RedisService, Redis],
  useFactory: async (redisService: RedisService, redis: Redis): Promise<IRoomRepository> => {
    const available = redisService.isAvailable
      || await redis.ping().then(() => true).catch(() => false);

    if (available) {
      return new RoomRedisRepository(redis);
    }
    return new RoomMemoryRepository();
  },
};
