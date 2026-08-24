import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

import { MemeStorageService } from './meme-storage.service';

describe('MemeStorageService', () => {
  const config = {
    S3_ACCESS_KEY_ID: 'access',
    S3_SECRET_ACCESS_KEY: 'secret',
    S3_BUCKET_NAME: 'bucket',
    S3_REGION: 'us-east-1',
    S3_ENDPOINT: 'https://s3.example.com',
    S3_PUBLIC_URL: 'https://cdn.example.com',
  };

  let service: MemeStorageService;
  let sendMock: jest.SpyInstance;

  beforeEach(() => {
    service = new MemeStorageService({
      get: (key: string) => config[key as keyof typeof config],
    } as ConfigService);
    sendMock = jest
      .spyOn(S3Client.prototype, 'send')
      .mockResolvedValue({} as never);
  });

  afterEach(() => {
    sendMock.mockRestore();
  });

  it('uploads valid PNG and returns public URL', async () => {
    const file = {
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      size: 8,
      mimetype: 'image/png',
    } as Express.Multer.File;

    const result = await service.uploadMeme(file);

    expect(result.imageUrl).toMatch(
      /^https:\/\/cdn\.example\.com\/memes\/\d{4}\/\d{2}\/\d{2}\/.+\.png$/,
    );
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].input.ContentType).toBe('image/png');
  });

  it('rejects a MIME type with invalid image signature', async () => {
    const file = {
      buffer: Buffer.from('not an image'),
      size: 12,
      mimetype: 'image/png',
    } as Express.Multer.File;

    await expect(service.uploadMeme(file)).rejects.toThrow(
      'Only valid JPEG, PNG, GIF, and WebP images are allowed',
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects images above 10 MiB', async () => {
    const file = {
      buffer: Buffer.alloc(1),
      size: 10 * 1024 * 1024 + 1,
      mimetype: 'image/png',
    } as Express.Multer.File;

    await expect(service.uploadMeme(file)).rejects.toThrow(
      'Meme image must be 10 MB or smaller',
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('accepts only URLs from configured public meme prefix', () => {
    expect(
      service.isPublicMemeUrl('https://cdn.example.com/memes/2026/01/a.png'),
    ).toBe(true);
    expect(service.isPublicMemeUrl('https://evil.example.com/memes/a.png')).toBe(
      false,
    );
    expect(service.isPublicMemeUrl('https://cdn.example.com/other/a.png')).toBe(
      false,
    );
  });

  it('derives public URL from endpoint and bucket when S3_PUBLIC_URL is absent', async () => {
    const configWithoutPublicUrl = { ...config };
    delete (configWithoutPublicUrl as Partial<typeof config>).S3_PUBLIC_URL;
    const fallbackService = new MemeStorageService({
      get: (key: string) =>
        configWithoutPublicUrl[key as keyof typeof configWithoutPublicUrl],
    } as ConfigService);
    const file = {
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      size: 8,
      mimetype: 'image/png',
    } as Express.Multer.File;

    const result = await fallbackService.uploadMeme(file);

    expect(result.imageUrl).toMatch(
      /^https:\/\/s3\.example\.com\/bucket\/memes\//,
    );
  });
});
