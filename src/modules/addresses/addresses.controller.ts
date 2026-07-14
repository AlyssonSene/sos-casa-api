import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { AddressesService } from './addresses.service'
import { CreateAddressDto } from './dto/create-address.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../users/entities/user.entity'
import { SwaggerResponses } from '../../common/swagger/responses'

const ADDRESS_EXAMPLE = {
  id: 'uuid',
  userId: 'uuid',
  label: 'Casa',
  street: 'Rua das Flores',
  number: '123',
  complement: 'Apto 4',
  neighborhood: 'Centro',
  city: 'Varginha',
  state: 'MG',
  zipCode: '37010-000',
  isDefault: true,
}

@ApiTags('addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly service: AddressesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar endereços do usuário autenticado',
    description: 'Retorna todos os endereços ordenados por `isDefault DESC, createdAt ASC`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de endereços.',
    schema: { example: [ADDRESS_EXAMPLE] },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  findAll(@CurrentUser() user: User) {
    return this.service.findByUser(user.id)
  }

  @Post()
  @ApiOperation({
    summary: 'Criar endereço',
    description:
      'Se `isDefault: true`, desmarca todos os outros endereços do usuário antes de salvar.',
  })
  @ApiResponse({
    status: 201,
    description: 'Endereço criado.',
    schema: { example: ADDRESS_EXAMPLE },
  })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  create(@CurrentUser() user: User, @Body() dto: CreateAddressDto) {
    return this.service.create(user.id, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar endereço' })
  @ApiParam({ name: 'id', description: 'UUID do endereço' })
  @ApiResponse({
    status: 200,
    description: 'Endereço atualizado.',
    schema: { example: ADDRESS_EXAMPLE },
  })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.notFound('Endereço'))
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: Partial<CreateAddressDto>,
  ) {
    return this.service.update(id, user.id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover endereço' })
  @ApiParam({ name: 'id', description: 'UUID do endereço' })
  @ApiResponse({ status: 200, description: 'Endereço removido.' })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.notFound('Endereço'))
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.remove(id, user.id)
  }
}
