import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { SwaggerResponses } from '../../common/swagger/responses';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Buscar usuário por ID (admin)',
    description: 'Retorna dados completos do usuário. O campo `passwordHash` é sempre excluído da resposta.',
  })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário.',
    schema: {
      example: {
        id: 'uuid',
        name: 'João Silva',
        email: 'joao@email.com',
        phone: '35999990000',
        role: 'client',
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        createdAt: '2026-07-11T00:00:00.000Z',
      },
    },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Usuário'))
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
