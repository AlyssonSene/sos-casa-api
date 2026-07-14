import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  Headers,
} from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiExcludeEndpoint,
} from '@nestjs/swagger'
import type { Request } from 'express'
import { PaymentsService } from './payments.service'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '../../common/enums/role.enum'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../users/entities/user.entity'
import { ProfessionalsService } from '../professionals/professionals.service'
import { SwaggerResponses } from '../../common/swagger/responses'

const PAYMENT_EXAMPLE = {
  id: 'uuid',
  requestId: 'uuid',
  method: 'stripe_card',
  amount: 15000,
  status: 'processing',
  stripePaymentIntentId: 'pi_xxx',
  stripeClientSecret: 'pi_xxx_secret_yyy',
  manualPixKey: null,
  manualPixKeyType: null,
  receiptAttachmentId: null,
  professionalConfirmedAt: null,
}

const PIX_PAYMENT_EXAMPLE = {
  ...PAYMENT_EXAMPLE,
  method: 'manual_pix',
  stripePaymentIntentId: null,
  stripeClientSecret: null,
  manualPixKey: '000.000.000-00',
  manualPixKeyType: 'cpf',
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  // ── POST /payments/webhook/stripe ──────────────────────────────────────────
  // Excluído do Swagger UI — endpoint chamado diretamente pelo Stripe

  @Post('webhook/stripe')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    await this.paymentsService.handleStripeWebhook(req.rawBody as Buffer, sig)
    return { received: true }
  }

  // ── POST /payments ─────────────────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: 'Iniciar pagamento',
    description:
      '**Stripe (`stripe_card` / `stripe_pix`):** cria um PaymentIntent e retorna o `stripeClientSecret` para finalização no frontend com Stripe.js.\n\n' +
      '**PIX manual (`manual_pix`):** salva o snapshot da chave PIX do profissional e aguarda o cliente enviar o comprovante via `POST /payments/:requestId/pix-receipt`.',
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
  async create(@Body() dto: CreatePaymentDto, @CurrentUser() _user: User) {
    // Para PIX manual, busca a chave PIX do profissional da solicitação
    let pixKey: string | undefined
    let pixKeyType: string | undefined

    if (dto.method === ('manual_pix' as any)) {
      // professionalId vem da solicitação — buscado no service via requestId
      const profile = await this.professionalsService.findByRequestId(dto.requestId)
      pixKey = profile?.pixKey ?? undefined
      pixKeyType = profile?.pixKeyType ?? undefined
    }

    return this.paymentsService.createPayment(0, dto, pixKey, pixKeyType)
  }

  // ── POST /payments/:requestId/pix-receipt ──────────────────────────────────

  @Post(':requestId/pix-receipt')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: 'Enviar comprovante de pagamento PIX manual',
    description:
      'O cliente informa o `attachmentId` do comprovante já enviado via upload. ' +
      'O status muda para `held` (aguardando confirmação do profissional). ' +
      'O profissional recebe notificação para confirmar o recebimento.',
  })
  @ApiParam({ name: 'requestId', description: 'UUID da solicitação de serviço' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['attachmentId'],
      properties: {
        attachmentId: {
          type: 'string',
          description: 'UUID do attachment com o comprovante',
          example: 'uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Comprovante registrado. Aguardando confirmação do profissional.',
    schema: { example: { ...PIX_PAYMENT_EXAMPLE, status: 'held', receiptAttachmentId: 'uuid' } },
  })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Pagamento'))
  async submitPixReceipt(
    @Param('requestId') requestId: string,
    @Body('attachmentId') attachmentId: string,
  ) {
    return this.paymentsService.submitPixReceipt(requestId, attachmentId)
  }

  // ── POST /payments/:requestId/confirm-pix ──────────────────────────────────

  @Post(':requestId/confirm-pix')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @ApiOperation({
    summary: 'Confirmar recebimento de PIX (profissional)',
    description:
      'O profissional confirma que recebeu o pagamento PIX na sua conta. ' +
      'O status muda para `released` e o serviço é considerado pago. ' +
      'Para PIX manual não há comissão automática — a comissão é cobrada separadamente.',
  })
  @ApiParam({ name: 'requestId', description: 'UUID da solicitação de serviço' })
  @ApiResponse({
    status: 201,
    description: 'Pagamento confirmado.',
    schema: {
      example: {
        ...PIX_PAYMENT_EXAMPLE,
        status: 'released',
        receiptAttachmentId: 'uuid',
        professionalConfirmedAt: '2026-07-11T12:00:00.000Z',
        releasedAt: '2026-07-11T12:00:00.000Z',
      },
    },
  })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Pagamento'))
  async confirmPix(@Param('requestId') requestId: string, @CurrentUser() user: User) {
    return this.paymentsService.confirmPixByProfessional(requestId, user.id)
  }

  // ── GET /payments ──────────────────────────────────────────────────────────

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar todos os pagamentos (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagamentos.',
    schema: { example: [PAYMENT_EXAMPLE] },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  findAll() {
    return this.paymentsService.findAllPayments()
  }

  // ── GET /payments/transactions ─────────────────────────────────────────────

  @Get('transactions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar transações de repasse (admin)',
    description:
      'Stripe: contém `stripeTransferId` e comissão de 15%.\nPIX manual: `stripeTransferId = null`, comissão = 0 (cobrada fora da plataforma).',
  })
  @ApiResponse({ status: 200, description: 'Lista de transações.' })
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  findTransactions() {
    return this.paymentsService.findAllTransactions()
  }

  // ── POST /payments/:requestId/release ──────────────────────────────────────

  @Post(':requestId/release')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Liberar escrow Stripe manualmente (admin)',
    description:
      'Força a liberação do escrow Stripe e dispara a transferência para a conta Stripe Connect do profissional. ' +
      'Exclusivo para métodos Stripe. Para PIX manual use `POST /payments/:requestId/confirm-pix`.',
  })
  @ApiParam({ name: 'requestId', description: 'UUID da solicitação de serviço' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['professionalStripeAccountId'],
      properties: {
        professionalStripeAccountId: {
          type: 'string',
          description: 'ID da conta Stripe Connect do profissional',
          example: 'acct_xxx',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Escrow liberado. Transferência Stripe iniciada.' })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  @ApiResponse(SwaggerResponses.forbidden)
  @ApiResponse(SwaggerResponses.notFound('Pagamento'))
  release(
    @Param('requestId') requestId: string,
    @Body('professionalStripeAccountId') stripeAccountId: string,
  ) {
    return this.paymentsService.releaseEscrow(requestId, stripeAccountId)
  }
}
