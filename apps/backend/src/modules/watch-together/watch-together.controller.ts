import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import axios from 'axios';
import { memoryStorage } from 'multer';

import { MemeStorageService } from './meme-storage.service';
import { WatchTogetherService } from './watch-together.service';

@ApiTags('watch')
@Controller('watch')
export class WatchTogetherController {
  private readonly logger = new Logger(WatchTogetherController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly memeStorageService: MemeStorageService,
    private readonly watchTogetherService: WatchTogetherService,
  ) {}

  @Post('upload-meme')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, callback) => {
        if (
          ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(
            file.mimetype,
          )
        ) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              'Only JPEG, PNG, GIF, and WebP images are allowed',
            ),
            false,
          );
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a meme image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roomId: {
          type: 'string',
          description: 'Active room code',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.PAYLOAD_TOO_LARGE,
    description: 'Image exceeds the 10 MiB limit',
  })
  async uploadMeme(
    @Body('roomId') roomId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!roomId || !(await this.watchTogetherService.getRoom(roomId))) {
      throw new BadRequestException('Valid roomId is required');
    }

    const result = await this.memeStorageService.uploadMeme(file);
    this.logger.log(`Meme uploaded to object storage: ${result.imageUrl}`);
    return result;
  }

  @Get('youtube-search')
  @ApiOperation({ summary: 'Search YouTube videos via proxy' })
  @ApiResponse({
    status: 200,
    description: 'YouTube search results',
  })
  async searchYouTube(@Query('q') query: string) {
    const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) {
      this.logger.error('YOUTUBE_API_KEY not configured');
      return { error: 'YouTube API key not configured' };
    }

    try {
      const response = await axios.get(
        'https://www.googleapis.com/youtube/v3/search',
        {
          params: {
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults: 10,
            key: apiKey,
          },
        },
      );

      const results = response.data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.default?.url || '',
      }));

      return { data: results };
    } catch (error) {
      this.logger.error('YouTube search failed', error);
      return { error: 'YouTube search failed' };
    }
  }
}
