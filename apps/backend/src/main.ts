import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { json, urlencoded } from 'body-parser';
import * as compression from 'compression';
import Redis from 'ioredis';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception/http-exception.filter';
import { RedisIoAdapter } from './redis/redis-io.adapter';
import { RedisService } from './redis/redis.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const redisService = app.get(RedisService);
  if (redisService.isAvailable) {
    const redisIoAdapter = new RedisIoAdapter(app);
    const redis = app.get(Redis);
    await redisIoAdapter.connectToRedis(redis);
    app.useWebSocketAdapter(redisIoAdapter);
  }

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));
  app.use(compression());

  const swagger = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API documentation for the application')
    .setVersion('1.0')
    .addServer(
      `http://localhost:${configService.get('APP_PORT') ?? 3001}`,
      'local development',
    );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  if (configService.get('NODE_ENV') !== 'production') {
    const document = SwaggerModule.createDocument(app, swagger.build());
    app.use(
      '/docs',
      apiReference({
        content: document,
      }),
    );
  }

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = configService.get('APP_PORT') || 3001;
  await app.listen(port);
  console.log(`
    Application is running on: http://localhost:${port}
    API Documentation: http://localhost:${port}/docs
  `);
}
void bootstrap();
