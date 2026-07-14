import { Controller, Get, Post, Body, Param, UseGuards, Req, HttpCode } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { SwaggerResponses } from '../../common/swagger/responses';

const PAYMENT_EXAMPLE = {
  id: 'uuid',
  requestId: 'uuid',
  gateway: 'pagarme',
  method: 'pix',
  amount: 15000,
  status: 'held',
  pixCode: '00020126580014...',
  paidAt: '2026-07-11T10:00:00.000Z',
  heldAt: '2026-07-11T10:01:00.000Z',
  releasedAt: null,
};

const TRANSACTION_EXAMPLE = {
  id: 'uuid',
  paymentId: 'uuid',
  professionalId: 'uuid',
  grossAmount: 15000,
  commissionRate: 15,
  commissionAmount: 2250,
  netAmount: 12750,
  status: 'pending',
};

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  // ── POST /payments/webhook ─────────────────────────────────────────────────
  // Excluído do Swagger UI para não expor o endpoint de webhook publicamente

  @Post('webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  webhook(@Req() req: { body: Record<string, unknown> }) {
    return this.service.handleWebhook(req.body);
  }

  // ── POST /payments ─────────────────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: 'Iniciar pagamento via Pagar.me',
    description:
      'Cria um Order no Pagar.me e retorna o QR code PIX (ou link de boleto). ' +
      'O status do pagamento é atualizado via webhook em `POST /payments/webhook`.',
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Pagamento iniciado.',
    schema: { example: PAYMENT_EXAMPLE },
  })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  create(@Body() dto: CreatePaymentDto) {
    return this.service.createPayment(0, dto);
  }

  // ── GET /payments ──────────────────────────────────────────────────────────

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar todos os pagamentos (admin)',
    description: 'Retorna todos os registros de pagamento. Requer role `admin`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagamentos.',
    schema: { example: [PAYMENT_EXAMPLE] },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  findAll() {
    return this.service.findAllPayments();
  }

  // ── GET /payments/transactions ─────────────────────────────────────────────

  @Get('transactions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar transações de repasse (admin)',
    description:
      'Retorna os registros de repasse para profissionais (após liberação do escrow). ' +
      'Cada transação inclui comissão de 15% da plataforma.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de transações.',
    schema: { example: [TRANSACTION_EXAMPLE] },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  findTransactions() {
    return this.service.findAllTransactions();
  }

  // ── POST /payments/:requestId/release ──────────────────────────────────────

  @Post(':requestId/release')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Liberar escrow manualmente (admin)',
    description:
      'Força a liberação do valor retido em escrow para o profissional. ' +
      'Em condições normais, a liberação ocorre automaticamente 24h após confirmação do cliente.',
  })
  @ApiParam({ name: 'requestId', description: 'UUID da solicitação de serviço' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['professionalId'],
      properties: { professionalId: { type: 'string', example: 'uuid-do-profissional' } },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Escrow liberado. Transação de repasse criada.',
    schema: { example: TRANSACTION_EXAMPLE },
  })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Pagamento'))
  release(
    @Param('requestId') requestId: string,
    @Body('professionalId') professionalId: string,
  ) {
    return this.service.releaseEscrow(requestId, professionalId);
  }
}
