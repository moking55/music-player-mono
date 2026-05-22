import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: Redis,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>(
          'REDIS_URL',
          'redis://localhost:6379',
        );
        const redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 5) {
              return null;
            }
            return Math.min(times * 200, 2000);
          },
          lazyConnect: true,
        });

        redis.on('error', (err) => {
          console.warn('[Redis] Connection error:', err.message);
        });

        redis.on('connect', () => {
          console.log('[Redis] Connected successfully');
        });

        return redis;
      },
    },
    RedisService,
  ],
  exports: [Redis, RedisService],
})
export class RedisModule {}
