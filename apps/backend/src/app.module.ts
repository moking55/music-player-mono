import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { DatabaseModule } from './database/database.module';
import { SocketModule } from './modules/socket/socket.module';
import { WatchTogetherModule } from './modules/watch-together/watch-together.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    // DatabaseModule,
    // UsersModule,
    // ProductModule,
    SocketModule,
    WatchTogetherModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
