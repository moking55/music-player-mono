import { mkdirSync, existsSync } from 'fs';
import { extname, join } from 'path';

import {
  Controller,
  Post,
  Get,
  Query,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Logger,
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
import { diskStorage } from 'multer';

@ApiTags('watch')
@Controller('watch')
export class WatchTogetherController {
  private readonly logger = new Logger(WatchTogetherController.name);
  private readonly uploadsDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  @Post('upload-meme')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          callback(null, join(process.cwd(), 'uploads'));
        },
        filename: (_req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `meme-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (_req, file, callback) => {
        if (file.mimetype.startsWith('image/')) {
          callback(null, true);
        } else {
          callback(new Error('Only image files are allowed'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a meme image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
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
  uploadMeme(@UploadedFile() file: Express.Multer.File) {
    this.logger.log(`Meme uploaded: ${file.filename}`);
    return { imageUrl: `/uploads/${file.filename}` };
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
