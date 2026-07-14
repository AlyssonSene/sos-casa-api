import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { SwaggerResponses } from '../../common/swagger/responses';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  @Get('health')
  @ApiOperation({
    summary: 'Health check da API (admin)',
    description: 'Retorna status e timestamp. Requer role `admin`.',
  })
  @ApiResponse({
    status: 200,
    description: 'API operacional.',
    schema: { example: { status: 'ok', timestamp: '2026-07-11T00:00:00.000Z' } },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
