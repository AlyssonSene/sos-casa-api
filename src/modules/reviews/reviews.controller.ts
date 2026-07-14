import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SwaggerResponses } from '../../common/swagger/responses';

const REVIEW_EXAMPLE = {
  id: 'uuid',
  requestId: 'uuid',
  clientId: 'uuid',
  professionalId: 'uuid',
  rating: 5,
  comment: 'Serviço excelente, muito pontual!',
  tags: ['pontual', 'organizado'],
  createdAt: '2026-07-11T12:00:00.000Z',
};

@ApiTags('reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: 'Criar avaliação',
    description:
      'Permite ao cliente avaliar o profissional após a conclusão do serviço. ' +
      'Uma solicitação aceita apenas uma avaliação (409 se já existir).',
  })
  @ApiResponse({
    status: 201,
    description: 'Avaliação criada.',
    schema: { example: REVIEW_EXAMPLE },
  })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.conflict('Esta solicitação já foi avaliada.'))
  create(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.service.create(user.id, dto);
  }

  @Get('professional/:id')
  @ApiOperation({
    summary: 'Avaliações de um profissional',
    description: 'Retorna todas as avaliações públicas do profissional. Endpoint público.',
  })
  @ApiParam({ name: 'id', description: 'UUID do profissional' })
  @ApiResponse({
    status: 200,
    description: 'Lista de avaliações.',
    schema: { example: [REVIEW_EXAMPLE] },
  })
  byProfessional(@Param('id') id: string) {
    return this.service.findByProfessional(id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar todas as avaliações (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Lista completa de avaliações.',
    schema: { example: [REVIEW_EXAMPLE] },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  findAll() {
    return this.service.findAll();
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remover avaliação (admin)', description: 'Remove uma avaliação inapropriada.' })
  @ApiParam({ name: 'id', description: 'UUID da avaliação' })
  @ApiResponse({ status: 200, description: 'Avaliação removida.' })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Avaliação'))
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
