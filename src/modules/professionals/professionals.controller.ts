import { Controller, Get, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger'
import { ProfessionalsService } from './professionals.service'
import { UpdatePixKeyDto } from './dto/update-pix-key.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '../../common/enums/role.enum'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../users/entities/user.entity'
import { ApprovalStatus, PixKeyType } from './entities/professional-profile.entity'
import { SwaggerResponses } from '../../common/swagger/responses'

const PROFESSIONAL_EXAMPLE = {
  id: 'uuid',
  userId: 'uuid',
  city: 'Varginha',
  state: 'MG',
  approvalStatus: 'pending',
  stripeAccountId: null,
  pixKey: null,
  pixKeyType: null,
  avgRating: 4.8,
  totalServices: 32,
}

@ApiTags('professionals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly service: ProfessionalsService) {}

  // ── GET /professionals (admin) ─────────────────────────────────────────────

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar profissionais (admin)',
    description:
      'Retorna perfis de profissionais, opcionalmente filtrados por status de aprovação.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ApprovalStatus })
  @ApiResponse({
    status: 200,
    description: 'Lista de profissionais.',
    schema: { example: [PROFESSIONAL_EXAMPLE] },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  findAll(@Query('status') status?: ApprovalStatus) {
    return this.service.findAll(status)
  }

  // ── GET /professionals/:id (admin) ─────────────────────────────────────────

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Detalhar profissional (admin)' })
  @ApiParam({ name: 'id', description: 'UUID do perfil' })
  @ApiResponse({
    status: 200,
    description: 'Dados do profissional.',
    schema: { example: PROFESSIONAL_EXAMPLE },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Profissional'))
  findOne(@Param('id') id: string) {
    return this.service.findById(id)
  }

  // ── PATCH /professionals/:id/approve (admin) ───────────────────────────────

  @Patch(':id/approve')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Aprovar profissional (admin)',
    description: 'Aprova o cadastro, habilitando o profissional a receber solicitações.',
  })
  @ApiParam({ name: 'id', description: 'UUID do perfil' })
  @ApiResponse({
    status: 200,
    description: 'Profissional aprovado.',
    schema: {
      example: {
        ...PROFESSIONAL_EXAMPLE,
        approvalStatus: 'approved',
        approvedAt: '2026-07-11T10:00:00.000Z',
      },
    },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Profissional'))
  approve(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.service.approve(id, admin.id)
  }

  // ── PATCH /professionals/:id/reject (admin) ────────────────────────────────

  @Patch(':id/reject')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Rejeitar profissional (admin)' })
  @ApiParam({ name: 'id', description: 'UUID do perfil' })
  @ApiResponse({
    status: 200,
    description: 'Profissional rejeitado.',
    schema: { example: { ...PROFESSIONAL_EXAMPLE, approvalStatus: 'rejected' } },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Profissional'))
  reject(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.service.reject(id, admin.id)
  }

  // ── PATCH /professionals/me/pix-key ───────────────────────────────────────

  @Patch('me/pix-key')
  @Roles(Role.PROFESSIONAL)
  @ApiOperation({
    summary: 'Cadastrar/atualizar chave PIX (profissional)',
    description:
      'O profissional cadastra ou atualiza sua chave PIX. ' +
      'Essa chave é exibida ao cliente quando ele escolhe a opção de pagamento PIX manual, ' +
      'permitindo que ele realize o pagamento diretamente pelo seu banco.',
  })
  @ApiBody({ type: UpdatePixKeyDto })
  @ApiResponse({
    status: 200,
    description: 'Chave PIX atualizada.',
    schema: {
      example: { ...PROFESSIONAL_EXAMPLE, pixKey: '000.000.000-00', pixKeyType: PixKeyType.CPF },
    },
  })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Perfil profissional'))
  updatePixKey(@CurrentUser() user: User, @Body() dto: UpdatePixKeyDto) {
    return this.service.updatePixKey(user.id, dto)
  }

  // ── DELETE /professionals/me/pix-key ──────────────────────────────────────

  @Delete('me/pix-key')
  @Roles(Role.PROFESSIONAL)
  @ApiOperation({
    summary: 'Remover chave PIX (profissional)',
    description:
      'Remove a chave PIX do perfil. Após isso, a opção de pagamento PIX manual não estará disponível.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chave PIX removida.',
    schema: { example: { ...PROFESSIONAL_EXAMPLE, pixKey: null, pixKeyType: null } },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Perfil profissional'))
  removePixKey(@CurrentUser() user: User) {
    return this.service.removePixKey(user.id)
  }
}
