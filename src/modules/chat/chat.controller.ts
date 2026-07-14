import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { ChatService } from './chat.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { SwaggerResponses } from '../../common/swagger/responses'

const MESSAGE_EXAMPLE = {
  id: 'uuid',
  roomId: 'uuid',
  senderId: 'uuid',
  content: 'Olá, estou a caminho!',
  readAt: null,
  createdAt: '2026-07-11T10:00:00.000Z',
}

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Get(':requestId/messages')
  @ApiOperation({
    summary: 'Histórico de mensagens de uma solicitação',
    description:
      'Retorna todas as mensagens da sala de chat vinculada à solicitação de serviço. ' +
      'A comunicação em tempo real ocorre via Socket.io no namespace `/chat`.',
  })
  @ApiParam({ name: 'requestId', description: 'UUID da solicitação de serviço' })
  @ApiResponse({
    status: 200,
    description: 'Lista de mensagens ordenadas por data.',
    schema: { example: [MESSAGE_EXAMPLE] },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.notFound('Sala de chat'))
  getMessages(@Param('requestId') requestId: string) {
    return this.service.findRoom(requestId).then((r) => this.service.getMessages(r.id))
  }
}
