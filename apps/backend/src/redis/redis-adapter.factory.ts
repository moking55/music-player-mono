import { createAdapter } from '@socket.io/redis-adapter';

import type Redis from 'ioredis';

export function createRedisAdapter(redis: Redis) {
  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();

  pubClient.on('error', (err) => {
    console.warn('[Redis Adapter] Pub error:', err.message);
  });

  subClient.on('error', (err) => {
    console.warn('[Redis Adapter] Sub error:', err.message);
  });

  return createAdapter(pubClient, subClient);
}
