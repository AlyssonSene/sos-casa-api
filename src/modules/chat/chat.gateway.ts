import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { ChatService } from './chat.service'
import { MessageType } from './entities/chat-message.entity'

interface SendMessagePayload {
  requestId: string
  content: string
  type?: MessageType
}
interface JoinRoomPayload {
  requestId: string
}

@WebSocketGateway({ cors: { origin: '*', credentials: true }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private readonly logger = new Logger(ChatGateway.name)

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(@MessageBody() payload: JoinRoomPayload, @ConnectedSocket() client: Socket) {
    const room = await this.chatService.findOrCreateRoom(payload.requestId)
    await client.join(room.id)
    const messages = await this.chatService.getMessages(room.id)
    client.emit('room_history', { roomId: room.id, messages })
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() payload: SendMessagePayload,
    @ConnectedSocket() client: Socket,
  ) {
    // senderId seria extraído do JWT no handshake — simplificado aqui
    const senderId: string = (client.handshake.auth as { userId?: string }).userId ?? ''
    const room = await this.chatService.findOrCreateRoom(payload.requestId)
    const message = await this.chatService.saveMessage(
      room.id,
      senderId,
      payload.content,
      payload.type,
    )
    this.server.to(room.id).emit('new_message', message)
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(@MessageBody() payload: JoinRoomPayload, @ConnectedSocket() client: Socket) {
    const senderId: string = (client.handshake.auth as { userId?: string }).userId ?? ''
    const room = await this.chatService.findRoom(payload.requestId)
    await this.chatService.markRead(room.id, senderId)
    client.emit('messages_read', { roomId: room.id })
  }
}
