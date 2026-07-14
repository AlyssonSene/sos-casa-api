import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../users/entities/user.entity'
import { SwaggerResponses } from '../../common/swagger/responses'

const NOTIFICATION_EXAMPLE = {
  id: 'uuid',
  userId: 'uuid',
  title: 'Profissional a caminho',
  body: 'O profissional aceitou seu pedido e está a caminho.',
  type: 'service_request',
  data: { requestId: 'uuid' },
  readAt: null,
  createdAt: '2026-07-11T10:00:00.000Z',
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar notificações do usuário autenticado',
    description: 'Retorna as notificações mais recentes. `readAt: null` indica não lida.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificações.',
    schema: { example: [NOTIFICATION_EXAMPLE] },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  findAll(@CurrentUser() user: User) {
    return this.service.findByUser(user.id)
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  @ApiParam({ name: 'id', description: 'UUID da notificação' })
  @ApiResponse({
    status: 200,
    description: 'Notificação marcada como lida.',
    schema: { example: { ...NOTIFICATION_EXAMPLE, readAt: '2026-07-11T10:05:00.000Z' } },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.notFound('Notificação'))
  markRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.markRead(id, user.id)
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  @ApiResponse({ status: 200, description: 'Todas as notificações marcadas como lidas.' })
  @ApiResponse(SwaggerResponses.unauthorized)
  markAllRead(@CurrentUser() user: User) {
    return this.service.markAllRead(user.id)
  }
}
