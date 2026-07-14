import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { ClientsService } from './clients.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '../../common/enums/role.enum'
import { SwaggerResponses } from '../../common/swagger/responses'

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar clientes (admin)',
    description: 'Retorna todos os usuários com role `client`. Requer role `admin`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes.',
    schema: {
      example: [
        {
          id: 'uuid',
          name: 'João Silva',
          email: 'joao@email.com',
          phone: '35999990000',
          isActive: true,
          createdAt: '2026-07-11T00:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  findAll() {
    return this.service.findAll()
  }
}
