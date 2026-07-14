import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

const COMMISSION_RATE = 15; // 15% de comissão da plataforma
const ESCROW_HOURS   = 24; // horas após confirmação do cliente para liberar escrow

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private _stripe: Stripe | null = null;

  constructor(
    @InjectRepository(Payment)     private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    private readonly config: ConfigService,
  ) {
    const secretKey = this.config.get<string>('app.stripe.secretKey') || '';
    if (secretKey) {
      this._stripe = new Stripe(secretKey, { apiVersion: '2026-06-24.dahlia' });
      this.logger.log('[Stripe] SDK inicializado');
    } else {
      this.logger.warn('[Stripe] STRIPE_SECRET_KEY não configurado — pagamentos via Stripe desabilitados');
    }
  }

  /** Lança erro descritivo se Stripe não estiver configurado */
  private get stripe(): Stripe {
    if (!this._stripe) {
      throw new BadRequestException(
        'Stripe não configurado. Defina STRIPE_SECRET_KEY no .env para usar pagamentos via cartão ou PIX automático.',
      );
    }
    return this._stripe;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CRIAÇÃO DE PAGAMENTO
  // ────────────────────────────────────────────────────────────────────────────

  async createPayment(amount: number, dto: CreatePaymentDto, professionalPixKey?: string, professionalPixKeyType?: string): Promise<Payment> {
    const existing = await this.paymentRepo.findOneBy({ requestId: dto.requestId });
    if (existing) throw new BadRequestException('Já existe um pagamento para esta solicitação');

    const payment = this.paymentRepo.create({
      requestId: dto.requestId,
      method:    dto.method,
      amount,
      status:    PaymentStatus.PROCESSING,
    });
    const saved = await this.paymentRepo.save(payment);

    if (dto.method === PaymentMethod.MANUAL_PIX) {
      await this.initManualPix(saved, professionalPixKey, professionalPixKeyType);
    } else {
      await this.createStripePaymentIntent(saved, dto.stripePaymentMethodId);
    }

    return this.paymentRepo.findOneBy({ id: saved.id }) as Promise<Payment>;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STRIPE
  // ────────────────────────────────────────────────────────────────────────────

  private async createStripePaymentIntent(payment: Payment, paymentMethodId?: string): Promise<void> {
    try {
      const intent = await this.stripe.paymentIntents.create({
        amount:   Math.round(Number(payment.amount) * 100), // centavos
        currency: 'brl',
        payment_method_types: payment.method === PaymentMethod.STRIPE_PIX ? ['pix'] : ['card'],
        payment_method: paymentMethodId,
        capture_method:  'automatic',
        metadata: { paymentId: payment.id, requestId: payment.requestId },
      });

      payment.stripePaymentIntentId = intent.id;
      payment.stripeClientSecret    = intent.client_secret;
      payment.status = PaymentStatus.PROCESSING;
      await this.paymentRepo.save(payment);

      this.logger.log(`[Stripe] PaymentIntent criado: ${intent.id} para payment ${payment.id}`);
    } catch (err) {
      this.logger.error('[Stripe] Erro ao criar PaymentIntent', err);
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);
      throw err;
    }
  }

  /** Webhook Stripe — verificado com stripe.webhooks.constructEvent */
  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.get<string>('app.stripe.webhookSecret') ?? '';
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.error('[Stripe Webhook] Assinatura inválida', err);
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    this.logger.log(`[Stripe Webhook] ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const payment = await this.paymentRepo.findOneBy({ stripePaymentIntentId: intent.id });
        if (payment) {
          payment.status         = PaymentStatus.HELD;
          payment.stripeChargeId = intent.latest_charge as string | null;
          payment.paidAt         = new Date();
          payment.heldAt         = new Date();
          await this.paymentRepo.save(payment);
          this.scheduleEscrowRelease(payment.requestId, ESCROW_HOURS);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const payment = await this.paymentRepo.findOneBy({ stripePaymentIntentId: intent.id });
        if (payment) {
          payment.status = PaymentStatus.FAILED;
          await this.paymentRepo.save(payment);
        }
        break;
      }

      case 'transfer.created': {
        // Confirma a transferência Stripe Connect para o profissional
        const transfer = event.data.object as Stripe.Transfer;
        const tx = await this.txRepo.findOneBy({ stripeTransferId: transfer.id });
        if (tx) {
          tx.status        = TransactionStatus.TRANSFERRED;
          tx.transferredAt = new Date();
          await this.txRepo.save(tx);
        }
        break;
      }

      default:
        this.logger.debug(`[Stripe Webhook] Evento ignorado: ${event.type}`);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PIX MANUAL
  // ────────────────────────────────────────────────────────────────────────────

  private async initManualPix(payment: Payment, pixKey?: string, pixKeyType?: string): Promise<void> {
    if (!pixKey || !pixKeyType) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);
      throw new BadRequestException('Este profissional não possui chave PIX cadastrada');
    }

    // Salva snapshot da chave PIX no momento do pagamento
    payment.manualPixKey     = pixKey;
    payment.manualPixKeyType = pixKeyType;
    payment.status           = PaymentStatus.PROCESSING; // cliente ainda precisa pagar
    await this.paymentRepo.save(payment);

    this.logger.log(`[PIX Manual] Pagamento ${payment.id} aguardando comprovante. Chave: ${pixKeyType}:${pixKey}`);
  }

  /** Cliente envia o comprovante de pagamento PIX */
  async submitPixReceipt(requestId: string, attachmentId: string): Promise<Payment> {
    const payment = await this.findByRequest(requestId);

    if (payment.method !== PaymentMethod.MANUAL_PIX) {
      throw new BadRequestException('Esta operação é exclusiva para pagamentos PIX manual');
    }
    if (payment.status !== PaymentStatus.PROCESSING) {
      throw new BadRequestException(`Status atual (${payment.status}) não permite envio de comprovante`);
    }

    payment.receiptAttachmentId = attachmentId;
    payment.status              = PaymentStatus.HELD; // aguardando confirmação do profissional
    payment.paidAt              = new Date();
    await this.paymentRepo.save(payment);

    this.logger.log(`[PIX Manual] Comprovante recebido para payment ${payment.id}`);
    return payment;
  }

  /** Profissional confirma que recebeu o pagamento PIX */
  async confirmPixByProfessional(requestId: string, professionalUserId: string): Promise<Payment> {
    const payment = await this.findByRequest(requestId);

    if (payment.method !== PaymentMethod.MANUAL_PIX) {
      throw new BadRequestException('Esta operação é exclusiva para pagamentos PIX manual');
    }
    if (payment.status !== PaymentStatus.HELD) {
      throw new BadRequestException('Nenhum comprovante pendente de confirmação para este pagamento');
    }

    payment.status                  = PaymentStatus.RELEASED;
    payment.professionalConfirmedAt = new Date();
    payment.releasedAt              = new Date();
    await this.paymentRepo.save(payment);

    // PIX manual não tem escrow de plataforma — registra transação informativa (sem transferência Stripe)
    await this.createManualPixTransaction(payment, professionalUserId);

    this.logger.log(`[PIX Manual] Profissional ${professionalUserId} confirmou recebimento para payment ${payment.id}`);
    return payment;
  }

  private async createManualPixTransaction(payment: Payment, professionalId: string): Promise<Transaction> {
    const gross            = Number(payment.amount);
    // PIX manual: comissão não é debitada automaticamente (cobrada fora da plataforma ou combinada)
    const commissionAmount = 0;
    const netAmount        = gross;

    const tx = this.txRepo.create({
      paymentId:        payment.id,
      professionalId,
      grossAmount:      gross,
      commissionRate:   0,
      commissionAmount,
      netAmount,
      stripeTransferId: null, // sem transferência Stripe
      status:           TransactionStatus.TRANSFERRED, // dinheiro já foi direto ao profissional
      transferredAt:    new Date(),
    });
    return this.txRepo.save(tx);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ESCROW (Stripe)
  // ────────────────────────────────────────────────────────────────────────────

  async releaseEscrow(requestId: string, professionalStripeAccountId: string): Promise<Transaction> {
    const payment = await this.findByRequest(requestId);

    if (payment.status !== PaymentStatus.HELD) {
      throw new BadRequestException('Pagamento não está em escrow');
    }
    if (payment.method === PaymentMethod.MANUAL_PIX) {
      throw new BadRequestException('Use confirmPixByProfessional para pagamentos PIX manual');
    }

    const gross            = Number(payment.amount);
    const commissionAmount = Number(((gross * COMMISSION_RATE) / 100).toFixed(2));
    const netAmount        = Number((gross - commissionAmount).toFixed(2));

    payment.status     = PaymentStatus.RELEASED;
    payment.releasedAt = new Date();
    await this.paymentRepo.save(payment);

    const tx = this.txRepo.create({
      paymentId:        payment.id,
      professionalId:   professionalStripeAccountId,
      grossAmount:      gross,
      commissionRate:   COMMISSION_RATE,
      commissionAmount,
      netAmount,
      status:           TransactionStatus.PENDING,
    });
    const savedTx = await this.txRepo.save(tx);

    // Dispara transferência Stripe Connect
    this.transferViaStripe(savedTx, professionalStripeAccountId).catch((err) =>
      this.logger.error('[Stripe] Erro na transferência', err),
    );

    return savedTx;
  }

  private async transferViaStripe(tx: Transaction, stripeAccountId: string): Promise<void> {
    try {
      const transfer = await this.stripe.transfers.create({
        amount:      Math.round(Number(tx.netAmount) * 100),
        currency:    'brl',
        destination: stripeAccountId,
        metadata:    { transactionId: tx.id },
      });

      tx.stripeTransferId = transfer.id;
      tx.status           = TransactionStatus.PROCESSING;
      await this.txRepo.save(tx);

      this.logger.log(`[Stripe] Transfer criado: ${transfer.id}`);
    } catch (err) {
      this.logger.error('[Stripe] Erro ao criar transfer', err);
      tx.status = TransactionStatus.FAILED;
      await this.txRepo.save(tx);
      throw err;
    }
  }

  private scheduleEscrowRelease(requestId: string, hours: number): void {
    // MVP: setTimeout. Produção: substituir por Bull/BullMQ ou cron job
    const ms = hours * 60 * 60 * 1000;
    setTimeout(async () => {
      const payment = await this.paymentRepo.findOneBy({ requestId });
      if (payment?.status === PaymentStatus.HELD) {
        this.logger.log(`[Escrow] Auto-liberando pagamento do request ${requestId} após ${hours}h`);
        // A liberação automática não aciona a transferência Stripe — admin confirma manualmente
        payment.status     = PaymentStatus.RELEASED;
        payment.releasedAt = new Date();
        await this.paymentRepo.save(payment);
      }
    }, ms);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // QUERIES
  // ────────────────────────────────────────────────────────────────────────────

  async findByRequest(requestId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOneBy({ requestId });
    if (!payment) throw new NotFoundException(`Pagamento para a solicitação ${requestId} não encontrado`);
    return payment;
  }

  findAllPayments(): Promise<Payment[]> {
    return this.paymentRepo.find({ order: { createdAt: 'DESC' } });
  }

  findAllTransactions(): Promise<Transaction[]> {
    return this.txRepo.find({ order: { createdAt: 'DESC' } });
  }
}
