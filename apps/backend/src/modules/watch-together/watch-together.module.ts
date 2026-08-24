import { Module } from '@nestjs/common';

import { RedisModule } from '../../redis/redis.module';

import { roomRepositoryProvider } from './repositories/room.repository.provider';
import { WatchTogetherController } from './watch-together.controller';
import { WatchTogetherGateway } from './watch-together.gateway';
import { WatchTogetherService } from './watch-together.service';
import { MemeStorageService } from './meme-storage.service';

@Module({
  imports: [RedisModule],
  controllers: [WatchTogetherController],
  providers: [
    WatchTogetherGateway,
    WatchTogetherService,
    MemeStorageService,
    roomRepositoryProvider,
  ],
  exports: [WatchTogetherService],
})
export class WatchTogetherModule {}
