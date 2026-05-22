import { Injectable, Logger } from '@nestjs/common';

import type { Server } from 'socket.io';

@Injectable()
export class SocketService {
  private readonly logger = new Logger(SocketService.name);
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  broadcast(event: string, data: unknown) {
    if (this.server) {
      this.server.emit(event, data);
      this.logger.log(`Broadcasted ${event}`);
    }
  }

  sendToClient(clientId: string, event: string, data: unknown) {
    if (this.server) {
      this.server.to(clientId).emit(event, data);
    }
  }

  sendToRoom(room: string, event: string, data: unknown) {
    if (this.server) {
      this.server.to(room).emit(event, data);
    }
  }
}
