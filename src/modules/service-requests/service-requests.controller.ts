import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ServiceRequestsService } from './service-requests.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { RequestStatus } from '../../common/enums/request-status.enum';
import { SwaggerResponses } from '../../common/swagger/responses';

const REQUEST_EXAMPLE = {
  id: 'uuid',
  clientId: 'uuid',
  professionalId: null,
  addressId: 'uuid',
  status: 'pending',
  urgency: 'normal',
  description: 'Torneira vazando no banheiro.',
  materialProvider: 'client',
  subtotal: 0,
  travelFee: 0,
  platformFee: 0,
  total: 0,
  createdAt: '2026-07-11T10:00:00.000Z',
};

@ApiTags('service-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly service: ServiceRequestsService) {}

  // ── GET /service-requests ──────────────────────────────────────────────────

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar solicitações (admin)',
    description: 'Retorna todas as solicitações, com filtro opcional por status.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RequestStatus,
    description: 'Filtrar por status da solicitação',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitações.',
    schema: { example: [REQUEST_EXAMPLE] },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  findAll(@Query('status') status?: RequestStatus) {
    return this.service.findAll(status ? { status } : undefined);
  }

  // ── GET /service-requests/:id ──────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar solicitação' })
  @ApiParam({ name: 'id', description: 'UUID da solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Dados da solicitação.',
    schema: { example: REQUEST_EXAMPLE },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.notFound('Solicitação'))
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  // ── POST /service-requests ─────────────────────────────────────────────────

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: 'Criar solicitação de serviço',
    description:
      'Cria uma nova solicitação com status `pending`. ' +
      'O fluxo de status segue: pending → searching → accepted → on_the_way → arrived → in_progress → completed → confirmed → paid → finalized.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['addressId', 'description', 'urgency', 'materialProvider'],
      properties: {
        addressId: { type: 'string', example: 'uuid-do-endereco' },
        description: { type: 'string', example: 'Torneira vazando no banheiro.' },
        urgency: { type: 'string', enum: ['normal', 'urgent'], example: 'normal' },
        materialProvider: { type: 'string', enum: ['client', 'professional'], example: 'client' },
        materialValue: { type: 'number', example: 0 },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Solicitação criada com status `pending`.',
    schema: { example: REQUEST_EXAMPLE },
  })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  create(@Body() body: Partial<any>, @CurrentUser() user: User) {
    return this.service.create({ ...body, clientId: user.id });
  }

  // ── PATCH /service-requests/:id/cancel ────────────────────────────────────

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar solicitação',
    description:
      'Cancela a solicitação. Permitido apenas nos status: `pending`, `searching`, `accepted`, `on_the_way`, `arrived`. ' +
      'Retorna 400 se o status atual não permitir cancelamento.',
  })
  @ApiParam({ name: 'id', description: 'UUID da solicitação' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { reason: { type: 'string', example: 'Mudei de ideia.' } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação cancelada.',
    schema: { example: { ...REQUEST_EXAMPLE, status: 'cancelled', cancellationReason: 'Mudei de ideia.' } },
  })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.notFound('Solicitação'))
  cancel(@Param('id') id: string, @CurrentUser() user: User, @Body('reason') reason?: string) {
    return this.service.cancel(id, user.id, reason);
  }
}
