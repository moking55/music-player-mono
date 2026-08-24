import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

const maxMemeSize = 10 * 1024 * 1024;

type DetectedImage = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  extension: 'jpg' | 'png' | 'gif' | 'webp';
};

@Injectable()
export class MemeStorageService {
  private readonly logger = new Logger(MemeStorageService.name);
  private readonly client: S3Client;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const region = this.configService.get<string>('S3_REGION') || 'us-east-1';
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY');
    const forcePathStyleSetting = this.configService.get<string>(
      'S3_FORCE_PATH_STYLE',
    );
    const forcePathStyle = forcePathStyleSetting
      ? forcePathStyleSetting === 'true'
      : Boolean(endpoint);

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  async uploadMeme(file: Express.Multer.File): Promise<{ imageUrl: string }> {
    if (!file?.buffer) {
      throw new BadRequestException('Meme image is required');
    }

    if (file.size > maxMemeSize) {
      throw new BadRequestException('Meme image must be 10 MB or smaller');
    }

    const detectedImage = this.detectImage(file.buffer);
    if (!detectedImage || file.mimetype !== detectedImage.mimeType) {
      throw new BadRequestException(
        'Only valid JPEG, PNG, GIF, and WebP images are allowed',
      );
    }

    const bucket = this.configService.get<string>('S3_BUCKET_NAME');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY');
    const publicUrl = this.getPublicUrl(bucket);

    if (!bucket || !accessKeyId || !secretAccessKey || !publicUrl) {
      this.logger.error('S3 meme storage is not fully configured');
      throw new ServiceUnavailableException('Meme storage is not configured');
    }

    const now = new Date();
    const datePrefix = [
      now.getUTCFullYear(),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      String(now.getUTCDate()).padStart(2, '0'),
    ].join('/');
    const key = `memes/${datePrefix}/${randomUUID()}.${detectedImage.extension}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentLength: file.size,
          ContentType: detectedImage.mimeType,
          CacheControl: 'public, max-age=86400',
        }),
      );
    } catch (error) {
      this.logger.error('Meme upload to S3 failed', error);
      throw new ServiceUnavailableException('Meme upload failed');
    }

    return { imageUrl: `${publicUrl.replace(/\/+$/, '')}/${key}` };
  }

  isPublicMemeUrl(imageUrl: string): boolean {
    const bucket = this.configService.get<string>('S3_BUCKET_NAME');
    const publicUrl = bucket ? this.getPublicUrl(bucket) : null;
    if (!publicUrl || !imageUrl) {
      return false;
    }

    try {
      const base = new URL(publicUrl);
      const candidate = new URL(imageUrl);
      const basePath = base.pathname.replace(/\/+$/, '');
      return (
        candidate.origin === base.origin &&
        candidate.search === '' &&
        candidate.hash === '' &&
        candidate.pathname.startsWith(`${basePath}/memes/`)
      );
    } catch {
      return false;
    }
  }

  private detectImage(buffer: Buffer): DetectedImage | null {
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return { mimeType: 'image/jpeg', extension: 'jpg' };
    }

    if (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ) {
      return { mimeType: 'image/png', extension: 'png' };
    }

    if (
      buffer.length >= 6 &&
      (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
        buffer.subarray(0, 6).toString('ascii') === 'GIF89a')
    ) {
      return { mimeType: 'image/gif', extension: 'gif' };
    }

    if (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return { mimeType: 'image/webp', extension: 'webp' };
    }

    return null;
  }

  private getPublicUrl(bucket: string): string | null {
    const configuredPublicUrl = this.configService.get<string>('S3_PUBLIC_URL');
    if (configuredPublicUrl) {
      return configuredPublicUrl.replace(/\/+$/, '');
    }

    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    if (!endpoint) {
      return null;
    }

    return `${endpoint.replace(/\/+$/, '')}/${bucket}`;
  }
}
