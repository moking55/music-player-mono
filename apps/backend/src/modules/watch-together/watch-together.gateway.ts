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
  CreatePollPayload,
  VotePollPayload,
  PollStatusPayload,
} from 'shared-types';
import { Server, Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';

import { WatchTogetherService } from './watch-together.service';
import { MemeStorageService } from './meme-storage.service';

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

  constructor(
    private readonly watchService: WatchTogetherService,
    private readonly memeStorageService: MemeStorageService,
  ) {}

  private async isAuthorized(roomId: string, socketId: string): Promise<boolean> {
    return this.watchService.isSocketInRoom(roomId, socketId);
  }

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
    client.emit(
      RoomEvent.POLL_UPDATED,
      await this.watchService.getPollState(payload.roomId),
    );

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
    @ConnectedSocket() client: Socket,
  ) {
    if (!(await this.isAuthorized(payload.roomId, client.id))) {
      return;
    }
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
    @ConnectedSocket() client: Socket,
  ) {
    if (!(await this.isAuthorized(payload.roomId, client.id))) {
      return;
    }
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
    @ConnectedSocket() client: Socket,
  ) {
    if (!(await this.isAuthorized(payload.roomId, client.id))) {
      return;
    }
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
    @ConnectedSocket() client: Socket,
  ) {
    if (!(await this.isAuthorized(payload.roomId, client.id))) {
      return;
    }
    const room = await this.watchService.getRoom(payload.roomId);
    if (!room) {
      return;
    }

    const result = await this.watchService.getNextVideo(payload.roomId);
    if (result) {
      this.watchService.broadcastToRoom(payload.roomId, RoomEvent.QUEUE_UPDATED, {
        queue: result.queue,
        currentIndex: result.currentIndex,
      });
    }

    if (result?.video) {
      this.watchService.sendToHost(result.hostSocketId, RoomEvent.CMD_SKIP, {
        videoId: result.video.videoId,
      });
    }
    return { event: RoomEvent.CMD_SKIP, data: result?.video ?? null };
  }

  @SubscribeMessage(RoomEvent.ADD_TO_QUEUE)
  async handleAddToQueue(
    @MessageBody() payload: AddToQueuePayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!(await this.isAuthorized(payload.roomId, client.id))) {
      return;
    }
    const result = await this.watchService.addToQueue(
      payload.roomId,
      payload,
      client.id,
    );
    if (!result) {
      return;
    }

    this.watchService.broadcastToRoom(payload.roomId, RoomEvent.QUEUE_UPDATED, {
      queue: result.queue,
      currentIndex: result.currentIndex,
    });

    if (result.firstVideo) {
      this.watchService.sendToHost(result.hostSocketId, RoomEvent.CMD_SKIP, {
        videoId: result.firstVideo.videoId,
      });
    }

    return { event: RoomEvent.QUEUE_UPDATED, data: { queue: result.queue } };
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
    @ConnectedSocket() client: Socket,
  ) {
    if (!(await this.isAuthorized(payload.roomId, client.id))) {
      throw new WsException('Socket is not a member of this room');
    }

    if (!this.memeStorageService.isPublicMemeUrl(payload.imageUrl)) {
      throw new WsException('Invalid meme image URL');
    }

    const room = await this.watchService.getRoom(payload.roomId);
    if (!room) {
      return;
    }

    const memeData = { imageUrl: payload.imageUrl };

    this.watchService.sendToHost(room.hostSocketId, RoomEvent.MEME, memeData);
    return { event: RoomEvent.MEME, data: memeData };
  }

  @SubscribeMessage(RoomEvent.CREATE_POLL)
  async handleCreatePoll(
    @MessageBody() payload: CreatePollPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!(await this.isAuthorized(payload.roomId, client.id))) {
      return;
    }

    const question = typeof payload.question === 'string'
      ? payload.question.trim()
      : '';
    const validDuration = [30, 60, 120].includes(payload.duration);
    if (question.length < 5 || question.length > 200 || !validDuration) {
      client.emit(RoomEvent.POLL_ERROR, {
        message: 'Question must be 5–200 characters and duration must be 30, 60, or 120 seconds',
      });
      return;
    }

    const poll = await this.watchService.createPoll(
      payload.roomId,
      question,
      payload.duration,
    );
    if (!poll) {
      client.emit(RoomEvent.POLL_ERROR, {
        message: 'A poll is already active',
      });
      return;
    }

    this.watchService.broadcastToRoom(
      payload.roomId,
      RoomEvent.POLL_UPDATED,
      poll,
    );
    return { event: RoomEvent.POLL_UPDATED, data: poll };
  }

  @SubscribeMessage(RoomEvent.VOTE_POLL)
  async handleVotePoll(
    @MessageBody() payload: VotePollPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!(await this.isAuthorized(payload.roomId, client.id))) {
      return;
    }
    if (
      typeof payload.voterId !== 'string' ||
      payload.voterId.length < 16 ||
      !['yes', 'no'].includes(payload.choice)
    ) {
      client.emit(RoomEvent.POLL_ERROR, { message: 'Invalid poll vote' });
      return;
    }

    const result = await this.watchService.votePoll(
      payload.roomId,
      payload.pollId,
      payload.voterId,
      payload.choice,
    );
    if (result.poll) {
      this.watchService.broadcastToRoom(
        payload.roomId,
        RoomEvent.POLL_UPDATED,
        result.poll,
      );
    }
    if (result.outcome !== 'accepted') {
      client.emit(RoomEvent.POLL_ERROR, {
        message:
          result.outcome === 'already-voted'
            ? 'You already voted in this poll'
            : result.outcome === 'expired'
              ? 'This poll has ended'
              : 'Poll not found',
      });
      return;
    }

    return { event: RoomEvent.POLL_UPDATED, data: result.poll };
  }

  @SubscribeMessage(RoomEvent.GET_POLL_STATUS)
  async handleGetPollStatus(
    @MessageBody() payload: PollStatusPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!(await this.isAuthorized(payload.roomId, client.id))) {
      return;
    }
    const result = await this.watchService.getPollVoteStatus(
      payload.roomId,
      payload.pollId,
      payload.voterId,
    );
    client.emit(RoomEvent.POLL_VOTE_STATUS, {
      pollId: payload.pollId,
      hasVoted: result.hasVoted,
    });
    return {
      event: RoomEvent.POLL_VOTE_STATUS,
      data: { pollId: payload.pollId, hasVoted: result.hasVoted },
    };
  }

  @SubscribeMessage(RoomEvent.FORCE_PLAY)
  async handleForcePlay(
    @MessageBody() payload: { roomId: string; index: number },
    @ConnectedSocket() client: Socket,
  ) {
    if (!(await this.isAuthorized(payload.roomId, client.id))) {
      return;
    }
    const room = await this.watchService.getRoom(payload.roomId);
    if (!room) {
      return;
    }

    const result = await this.watchService.forcePlayVideo(
      payload.roomId,
      payload.index,
    );
    if (result) {
      this.watchService.broadcastToRoom(
        payload.roomId,
        RoomEvent.QUEUE_UPDATED,
        {
          queue: result.queue,
          currentIndex: result.currentIndex,
        },
      );
      this.watchService.sendToHost(result.hostSocketId, RoomEvent.CMD_SKIP, {
        videoId: result.video?.videoId,
      });
    }

    return { event: RoomEvent.CMD_SKIP, data: result?.video ?? null };
  }

  @SubscribeMessage(RoomEvent.REORDER_QUEUE)
  async handleReorderQueue(
    @MessageBody()
    payload: { roomId: string; fromIndex: number; toIndex: number },
    @ConnectedSocket() client: Socket,
  ) {
    if (!(await this.isAuthorized(payload.roomId, client.id))) {
      return;
    }
    const room = await this.watchService.getRoom(payload.roomId);
    if (!room) {
      return;
    }

    const result = await this.watchService.reorderQueue(
      payload.roomId,
      payload.fromIndex,
      payload.toIndex,
    );
    if (!result) {
      return;
    }

    this.watchService.broadcastToRoom(payload.roomId, RoomEvent.QUEUE_UPDATED, {
      queue: result.queue,
      currentIndex: result.currentIndex,
    });

    return { event: RoomEvent.QUEUE_UPDATED, data: { queue: result.queue } };
  }

  @SubscribeMessage(RoomEvent.REMOVE_FROM_QUEUE)
  async handleRemoveFromQueue(
    @MessageBody() payload: { roomId: string; index: number },
    @ConnectedSocket() client: Socket,
  ) {
    if (!(await this.isAuthorized(payload.roomId, client.id))) {
      return;
    }
    const room = await this.watchService.getRoom(payload.roomId);
    if (!room) {
      return;
    }

    const result = await this.watchService.removeFromQueue(
      payload.roomId,
      payload.index,
    );
    if (!result) {
      return;
    }

    this.watchService.broadcastToRoom(payload.roomId, RoomEvent.QUEUE_UPDATED, {
      queue: result.queue,
      currentIndex: result.currentIndex,
    });

    return {
      event: RoomEvent.QUEUE_UPDATED,
      data: { queue: result.queue },
    };
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

    void client.join(payload.roomId);

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
      client.emit(
        RoomEvent.POLL_UPDATED,
        await this.watchService.getPollState(payload.roomId),
      );

      const currentVideo =
        room.currentIndex >= 0 && room.currentIndex < room.queue.length
          ? room.queue[room.currentIndex]
          : null;
      if (currentVideo) {
        client.emit(RoomEvent.CMD_SKIP, {
          videoId: currentVideo.videoId,
        });
      }

      this.watchService.broadcastToRoom(
        payload.roomId,
        RoomEvent.PLAYER_STATE_UPDATE,
        room.playerState,
      );
    }

    return { event: 'host-reconnected', data: { roomId: payload.roomId } };
  }
}
