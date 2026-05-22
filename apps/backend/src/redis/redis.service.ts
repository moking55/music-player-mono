import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

import type { OnModuleInit } from '@nestjs/common';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private available = false;

  constructor(private readonly redis: Redis) {}

  async onModuleInit() {
    try {
      await this.redis.connect();
      this.available = true;
      this.logger.log('Redis connection established');
    } catch (error) {
      this.available = false;
      this.logger.warn(
        `Redis unavailable, falling back to in-memory storage: ${(error as Error).message}`,
      );
    }
  }

  get client(): Redis {
    return this.redis;
  }

  get isAvailable(): boolean {
    return this.available;
  }
}
