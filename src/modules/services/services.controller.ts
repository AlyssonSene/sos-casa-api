import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Delete } from '@nestjs/common'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger'
import { ServicesService } from './services.service'
import { CreateServiceDto, UpsertProfessionalServiceDto } from './dto/create-service.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '../../common/enums/role.enum'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../users/entities/user.entity'
import { SwaggerResponses } from '../../common/swagger/responses'

const SERVICE_EXAMPLE = {
  id: 'uuid',
  categoryId: 'uuid',
  name: 'Troca de torneira',
  description: 'Substituição de torneira residencial.',
  isPriceVariable: false,
  estimatedDurationMinutes: 60,
  isActive: true,
}

const PROF_SERVICE_EXAMPLE = {
  id: 'uuid',
  professionalId: 'uuid',
  serviceId: 'uuid',
  price: 8000,
  service: SERVICE_EXAMPLE,
}

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  // ── GET /services ──────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Listar serviços disponíveis',
    description:
      'Retorna serviços ativos. Filtrar por categoria via `categoryId`. Endpoint público.',
  })
  @ApiQuery({ name: 'categoryId', required: false, description: 'UUID da categoria para filtrar' })
  @ApiResponse({
    status: 200,
    description: 'Lista de serviços.',
    schema: { example: [SERVICE_EXAMPLE] },
  })
  findAll(@Query('categoryId') categoryId?: string) {
    return this.service.findAll(categoryId)
  }

  // ── GET /services/:id ──────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar serviço' })
  @ApiParam({ name: 'id', description: 'UUID do serviço' })
  @ApiResponse({
    status: 200,
    description: 'Dados do serviço.',
    schema: { example: SERVICE_EXAMPLE },
  })
  @ApiResponse(SwaggerResponses.notFound('Serviço'))
  findOne(@Param('id') id: string) {
    return this.service.findById(id)
  }

  // ── POST /services (admin) ─────────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar serviço (admin)' })
  @ApiResponse({
    status: 201,
    description: 'Serviço criado.',
    schema: { example: SERVICE_EXAMPLE },
  })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  create(@Body() dto: CreateServiceDto) {
    return this.service.create(dto)
  }

  // ── PATCH /services/:id (admin) ────────────────────────────────────────────

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar serviço (admin)' })
  @ApiParam({ name: 'id', description: 'UUID do serviço' })
  @ApiResponse({
    status: 200,
    description: 'Serviço atualizado.',
    schema: { example: SERVICE_EXAMPLE },
  })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Serviço'))
  update(@Param('id') id: string, @Body() dto: Partial<CreateServiceDto>) {
    return this.service.update(id, dto)
  }

  // ── GET /services/professional/my ──────────────────────────────────────────

  @Get('professional/my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @ApiOperation({
    summary: 'Meus serviços (profissional)',
    description: 'Retorna os serviços ofertados pelo profissional autenticado, com seus preços.',
  })
  @ApiResponse({
    status: 200,
    description: 'Serviços do profissional.',
    schema: { example: [PROF_SERVICE_EXAMPLE] },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  myServices(@CurrentUser() user: User) {
    return this.service.findProfessionalServices(user.id)
  }

  // ── POST /services/professional/my ─────────────────────────────────────────

  @Post('professional/my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @ApiOperation({
    summary: 'Adicionar/atualizar serviço ofertado (profissional)',
    description:
      'Faz upsert do serviço na lista de ofertas do profissional. ' +
      'Se o serviço já estiver na lista, atualiza o preço.',
  })
  @ApiResponse({
    status: 201,
    description: 'Serviço adicionado/atualizado.',
    schema: { example: PROF_SERVICE_EXAMPLE },
  })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  upsertMyService(@CurrentUser() user: User, @Body() dto: UpsertProfessionalServiceDto) {
    return this.service.upsertProfessionalService(user.id, dto)
  }

  // ── DELETE /services/professional/my/:serviceId ────────────────────────────

  @Delete('professional/my/:serviceId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @ApiOperation({ summary: 'Remover serviço da lista de ofertas (profissional)' })
  @ApiParam({ name: 'serviceId', description: 'UUID do serviço a remover' })
  @ApiResponse({ status: 200, description: 'Serviço removido das ofertas.' })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  removeMyService(@CurrentUser() user: User, @Param('serviceId') serviceId: string) {
    return this.service.removeProfessionalService(user.id, serviceId)
  }
}
