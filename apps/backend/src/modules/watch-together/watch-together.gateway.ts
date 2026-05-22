import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  RoomEvent,
  JoinRoomPayload,
  PlayerStateUpdatePayload,
  AddToQueuePayload,
  SeekPayload,
  SendDanmuPayload,
  SendMemePayload,
} from 'shared-types';
import { Server, Socket } from 'socket.io';

import { WatchTogetherService } from './watch-together.service';

import type {
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';

@WebSocketGateway({ cors: { origin: '*' } })
export class WatchTogetherGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WatchTogetherGateway.name);

  constructor(private readonly watchService: WatchTogetherService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.watchService.setServer(this.server);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const hostRoomId = await this.watchService.handleHostDisconnect(client.id);
    if (hostRoomId) {
      this.watchService.broadcastToRoom(hostRoomId, 'host-disconnected', {
        roomId: hostRoomId,
      });
      return;
    }

    const clientRoomId = await this.watchService.getRoomIdByClient(client.id);
    if (clientRoomId) {
      await this.watchService.handleClientDisconnect(clientRoomId, client.id);
      const room = await this.watchService.getRoom(clientRoomId);
      if (room) {
        this.watchService.broadcastToRoom(
          clientRoomId,
          RoomEvent.CLIENT_COUNT_UPDATED,
          {
            count: room.clientCount,
          },
        );
      }
    }
  }

  @SubscribeMessage(RoomEvent.CREATE_ROOM)
  async handleCreateRoom(@ConnectedSocket() client: Socket) {
    const roomId = await this.watchService.createRoom(client.id);
    void client.join(roomId);
    client.emit(RoomEvent.ROOM_JOINED, {
      roomId,
      queue: [],
      currentIndex: -1,
      playerState: { playing: false, currentTime: 0, videoId: '' },
      clientCount: 0,
    });
    this.logger.log(`Host ${client.id} created room ${roomId}`);
    return { event: RoomEvent.ROOM_JOINED, data: { roomId } };
  }

  @SubscribeMessage(RoomEvent.JOIN_ROOM)
  async handleJoinRoom(
    @MessageBody() payload: JoinRoomPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const roomData = await this.watchService.joinRoom(
      payload.roomId,
      client.id,
    );
    if (!roomData) {
      client.emit('room-not-found', { roomId: payload.roomId });
      return { event: 'room-not-found', data: { roomId: payload.roomId } };
    }

    void client.join(payload.roomId);
    client.emit(RoomEvent.ROOM_JOINED, roomData);

    client.emit(RoomEvent.QUEUE_UPDATED, {
      queue: roomData.queue,
      currentIndex: roomData.currentIndex,
    });

    this.watchService.broadcastToRoom(
      payload.roomId,
      RoomEvent.CLIENT_COUNT_UPDATED,
      {
        count: roomData.clientCount,
      },
    );

    return { event: RoomEvent.ROOM_JOINED, data: roomData };
  }

  @SubscribeMessage(RoomEvent.PLAYER_STATE_UPDATE)
  async handlePlayerStateUpdate(
    @MessageBody() payload: PlayerStateUpdatePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = await this.watchService.getRoomIdByHost(client.id);
    if (!roomId) {
      return;
    }

    await this.watchService.updatePlayerState(roomId, payload);
    this.watchService.broadcastToRoom(
      roomId,
      RoomEvent.PLAYER_STATE_UPDATE,
      payload,
    );
    return { event: RoomEvent.PLAYER_STATE_UPDATE, data: payload };
  }

  @SubscribeMessage(RoomEvent.PLAY)
  async handlePlay(
    @MessageBody() payload: { roomId: string },
    @ConnectedSocket() _client: Socket,
  ) {
    const room = await this.watchService.getRoom(payload.roomId);
    if (!room) {
      return;
    }

    this.watchService.sendToHost(room.hostSocketId, RoomEvent.CMD_PLAY, {});
    return { event: RoomEvent.CMD_PLAY, data: {} };
  }

  @SubscribeMessage(RoomEvent.PAUSE)
  async handlePause(
    @MessageBody() payload: { roomId: string },
    @ConnectedSocket() _client: Socket,
  ) {
    const room = await this.watchService.getRoom(payload.roomId);
    if (!room) {
      return;
    }

    this.watchService.sendToHost(room.hostSocketId, RoomEvent.CMD_PAUSE, {});
    return { event: RoomEvent.CMD_PAUSE, data: {} };
  }

  @SubscribeMessage(RoomEvent.SEEK)
  async handleSeek(
    @MessageBody() payload: SeekPayload,
    @ConnectedSocket() _client: Socket,
  ) {
    const room = await this.watchService.getRoom(payload.roomId);
    if (!room) {
      return;
    }

    this.watchService.sendToHost(room.hostSocketId, RoomEvent.CMD_SEEK, {
      time: payload.time,
    });
    return { event: RoomEvent.CMD_SEEK, data: { time: payload.time } };
  }

  @SubscribeMessage(RoomEvent.SKIP)
  async handleSkip(
    @MessageBody() payload: { roomId: string },
    @ConnectedSocket() _client: Socket,
  ) {
    const room = await this.watchService.getRoom(payload.roomId);
    if (!room) {
      return;
    }

    const nextVideo = await this.watchService.getNextVideo(payload.roomId);
    const updatedRoom = await this.watchService.getRoom(payload.roomId);
    if (updatedRoom) {
      this.watchService.broadcastToRoom(
        payload.roomId,
        RoomEvent.QUEUE_UPDATED,
        {
          queue: updatedRoom.queue,
          currentIndex: updatedRoom.currentIndex,
        },
      );
    }

    if (nextVideo) {
      this.watchService.sendToHost(room.hostSocketId, RoomEvent.CMD_SKIP, {
        videoId: nextVideo.videoId,
      });
    }
    return { event: RoomEvent.CMD_SKIP, data: nextVideo };
  }

  @SubscribeMessage(RoomEvent.ADD_TO_QUEUE)
  async handleAddToQueue(
    @MessageBody() payload: AddToQueuePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const queue = await this.watchService.addToQueue(
      payload.roomId,
      payload,
      client.id,
    );

    const room = await this.watchService.getRoom(payload.roomId);
    if (room) {
      this.watchService.broadcastToRoom(
        payload.roomId,
        RoomEvent.QUEUE_UPDATED,
        {
          queue,
          currentIndex: room.currentIndex,
        },
      );
    }

    if (room && room.queue.length === 1 && room.currentIndex === -1) {
      await this.watchService.forcePlayVideo(payload.roomId, 0);
      const firstVideo = room.queue[0];
      this.watchService.broadcastToRoom(
        payload.roomId,
        RoomEvent.QUEUE_UPDATED,
        {
          queue: room.queue,
          currentIndex: 0,
        },
      );
      this.watchService.sendToHost(room.hostSocketId, RoomEvent.CMD_SKIP, {
        videoId: firstVideo.videoId,
      });
    }

    return { event: RoomEvent.QUEUE_UPDATED, data: { queue } };
  }

  @SubscribeMessage(RoomEvent.SEND_DANMU)
  async handleSendDanmu(
    @MessageBody() payload: SendDanmuPayload,
    @ConnectedSocket() _client: Socket,
  ) {
    const room = await this.watchService.getRoom(payload.roomId);
    if (!room) {
      return;
    }

    this.watchService.sendToHost(room.hostSocketId, RoomEvent.DANMU, {
      text: payload.text,
    });
    return { event: RoomEvent.DANMU, data: { text: payload.text } };
  }

  @SubscribeMessage(RoomEvent.SEND_MEME)
  async handleSendMeme(
    @MessageBody() payload: SendMemePayload,
    @ConnectedSocket() _client: Socket,
  ) {
    const room = await this.watchService.getRoom(payload.roomId);
    if (!room) {
      return;
    }

    const memeData = payload.base64
      ? { base64: payload.base64 }
      : { imageUrl: payload.imageUrl };

    this.watchService.sendToHost(room.hostSocketId, RoomEvent.MEME, memeData);
    return { event: RoomEvent.MEME, data: memeData };
  }

  @SubscribeMessage(RoomEvent.FORCE_PLAY)
  async handleForcePlay(
    @MessageBody() payload: { roomId: string; index: number },
    @ConnectedSocket() _client: Socket,
  ) {
    const room = await this.watchService.getRoom(payload.roomId);
    if (!room) {
      return;
    }

    const video = await this.watchService.forcePlayVideo(
      payload.roomId,
      payload.index,
    );
    if (video) {
      this.watchService.broadcastToRoom(
        payload.roomId,
        RoomEvent.QUEUE_UPDATED,
        {
          queue: room.queue,
          currentIndex: room.currentIndex,
        },
      );
      this.watchService.sendToHost(room.hostSocketId, RoomEvent.CMD_SKIP, {
        videoId: video.videoId,
      });
    }

    return { event: RoomEvent.CMD_SKIP, data: video };
  }

  @SubscribeMessage(RoomEvent.REORDER_QUEUE)
  async handleReorderQueue(
    @MessageBody()
    payload: { roomId: string; fromIndex: number; toIndex: number },
    @ConnectedSocket() _client: Socket,
  ) {
    const room = await this.watchService.getRoom(payload.roomId);
    if (!room) {
      return;
    }

    const queue = await this.watchService.reorderQueue(
      payload.roomId,
      payload.fromIndex,
      payload.toIndex,
    );

    this.watchService.broadcastToRoom(payload.roomId, RoomEvent.QUEUE_UPDATED, {
      queue,
      currentIndex: room.currentIndex,
    });

    return { event: RoomEvent.QUEUE_UPDATED, data: { queue } };
  }

  @SubscribeMessage(RoomEvent.REMOVE_FROM_QUEUE)
  async handleRemoveFromQueue(
    @MessageBody() payload: { roomId: string; index: number },
    @ConnectedSocket() _client: Socket,
  ) {
    const room = await this.watchService.getRoom(payload.roomId);
    if (!room) {
      return;
    }

    const queue = await this.watchService.removeFromQueue(
      payload.roomId,
      payload.index,
    );

    if (room.currentIndex === payload.index && queue.length > 0) {
      const nextVideo = queue[room.currentIndex] ?? queue[queue.length - 1];
      if (nextVideo) {
        this.watchService.sendToHost(room.hostSocketId, RoomEvent.CMD_SKIP, {
          videoId: nextVideo.videoId,
        });
      }
    }

    this.watchService.broadcastToRoom(payload.roomId, RoomEvent.QUEUE_UPDATED, {
      queue,
      currentIndex: room.currentIndex,
    });

    return { event: RoomEvent.QUEUE_UPDATED, data: { queue } };
  }

  @SubscribeMessage('reconnect-host')
  async handleReconnectHost(
    @MessageBody() payload: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const success = await this.watchService.reconnectHost(
      payload.roomId,
      client.id,
    );
    if (!success) {
      client.emit('room-not-found', { roomId: payload.roomId });
      return { event: 'room-not-found', data: { roomId: payload.roomId } };
    }

    this.logger.log(`Host reconnected to room ${payload.roomId}`);

    this.watchService.broadcastToRoom(payload.roomId, 'host-reconnected', {
      roomId: payload.roomId,
    });

    const room = await this.watchService.getRoom(payload.roomId);
    if (room) {
      client.emit('room-joined', {
        ...this.watchService.toRoomData(room),
        isHost: true,
      });
      client.emit('queue-updated', {
        queue: room.queue,
        currentIndex: room.currentIndex,
      });
    }

    return { event: 'host-reconnected', data: { roomId: payload.roomId } };
  }
}
