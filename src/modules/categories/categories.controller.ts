import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { SwaggerResponses } from '../../common/swagger/responses';

const CATEGORY_EXAMPLE = {
  id: 'uuid',
  name: 'Hidráulica',
  slug: 'hidraulica',
  iconUrl: 'https://cdn.example.com/icons/hidraulica.svg',
  isActive: true,
};

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar categorias',
    description: 'Retorna todas as categorias ativas. Endpoint público.',
  })
  @ApiResponse({ status: 200, description: 'Lista de categorias.', schema: { example: [CATEGORY_EXAMPLE] } })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar categoria (admin)' })
  @ApiResponse({ status: 201, description: 'Categoria criada.', schema: { example: CATEGORY_EXAMPLE } })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  create(@Body() body: Partial<any>) {
    return this.service.create(body);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar categoria (admin)' })
  @ApiParam({ name: 'id', description: 'UUID da categoria' })
  @ApiResponse({ status: 200, description: 'Categoria atualizada.', schema: { example: CATEGORY_EXAMPLE } })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Categoria'))
  update(@Param('id') id: string, @Body() body: Partial<any>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remover categoria (admin)' })
  @ApiParam({ name: 'id', description: 'UUID da categoria' })
  @ApiResponse({ status: 200, description: 'Categoria removida.' })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Categoria'))
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
