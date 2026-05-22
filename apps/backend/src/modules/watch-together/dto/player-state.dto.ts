import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean } from 'class-validator';

export class PlayerStateDto {
  @ApiProperty({ description: 'Whether the video is playing' })
  @IsBoolean()
  playing: boolean;

  @ApiProperty({ description: 'Current playback time in seconds' })
  @IsNumber()
  currentTime: number;

  @ApiProperty({ description: 'YouTube video ID' })
  @IsString()
  videoId: string;
}
