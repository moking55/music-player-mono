import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Length } from 'class-validator';

export class AddToQueueDto {
  @ApiProperty({ description: '6-character room code' })
  @IsString()
  @Length(6, 6)
  roomId: string;

  @ApiProperty({ description: 'YouTube video ID' })
  @IsString()
  videoId: string;

  @ApiProperty({ description: 'Video title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Video thumbnail URL' })
  @IsString()
  thumbnail: string;

  @ApiProperty({
    description: 'Socket ID of the user who added',
    required: false,
  })
  @IsString()
  @IsOptional()
  addedBy?: string;
}
