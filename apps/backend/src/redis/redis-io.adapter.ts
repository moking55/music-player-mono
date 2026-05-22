import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

import type Redis from 'ioredis';
import type { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  async connectToRedis(redis: Redis): Promise<void> {
    try {
      const pubClient = redis.duplicate();
      const subClient = redis.duplicate();

      pubClient.on('error', (err) => {
        this.logger.warn(`Redis adapter pub error: ${err.message}`);
      });

      subClient.on('error', (err) => {
        this.logger.warn(`Redis adapter sub error: ${err.message}`);
      });

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('Socket.io Redis adapter initialized');
    } catch (error) {
      this.logger.warn(
        `Redis adapter unavailable, using default in-memory adapter: ${(error as Error).message}`,
      );
      this.adapterConstructor = null;
    }
  }

  createIOServer(
    port: number,
    options?: ServerOptions,
  ): Record<string, unknown> {
    const server = super.createIOServer(port, options) as Record<
      string,
      unknown
    >;
    if (this.adapterConstructor) {
      (server as any).adapter(this.adapterConstructor);
    }
    return server;
  }
}
