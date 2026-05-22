import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class JoinRoomDto {
  @ApiProperty({ description: '6-character room code' })
  @IsString()
  @Length(6, 6)
  roomId: string;
}
