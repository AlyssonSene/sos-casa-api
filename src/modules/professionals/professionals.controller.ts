import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProfessionalsService } from './professionals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApprovalStatus } from './entities/professional-profile.entity';
import { SwaggerResponses } from '../../common/swagger/responses';

const PROFESSIONAL_EXAMPLE = {
  id: 'uuid',
  userId: 'uuid',
  bio: 'Hidráulico com 10 anos de experiência.',
  cpfCnpj: '000.000.000-00',
  approvalStatus: 'pending',
  pagarmeRecipientId: null,
  approvedAt: null,
  approvedById: null,
  rating: 4.8,
  totalReviews: 32,
};

@ApiTags('professionals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly service: ProfessionalsService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar profissionais (admin)',
    description: 'Retorna perfis de profissionais, opcionalmente filtrados por `status` de aprovação.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ApprovalStatus,
    description: 'Filtrar por status de aprovação',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de profissionais.',
    schema: { example: [PROFESSIONAL_EXAMPLE] },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  findAll(@Query('status') status?: ApprovalStatus) {
    return this.service.findAll(status);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Detalhar profissional (admin)' })
  @ApiParam({ name: 'id', description: 'UUID do perfil do profissional' })
  @ApiResponse({
    status: 200,
    description: 'Dados do profissional.',
    schema: { example: PROFESSIONAL_EXAMPLE },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Profissional'))
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Aprovar profissional (admin)',
    description:
      'Aprova o cadastro do profissional, habilitando-o a receber solicitações. ' +
      'Registra o admin aprovador e o timestamp de aprovação.',
  })
  @ApiParam({ name: 'id', description: 'UUID do perfil do profissional' })
  @ApiResponse({
    status: 200,
    description: 'Profissional aprovado.',
    schema: {
      example: { ...PROFESSIONAL_EXAMPLE, approvalStatus: 'approved', approvedAt: '2026-07-11T10:00:00.000Z' },
    },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Profissional'))
  approve(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.service.approve(id, admin.id);
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Rejeitar profissional (admin)',
    description: 'Rejeita o cadastro do profissional. O usuário pode reenviar documentação.',
  })
  @ApiParam({ name: 'id', description: 'UUID do perfil do profissional' })
  @ApiResponse({
    status: 200,
    description: 'Profissional rejeitado.',
    schema: { example: { ...PROFESSIONAL_EXAMPLE, approvalStatus: 'rejected' } },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Profissional'))
  reject(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.service.reject(id, admin.id);
  }
}
