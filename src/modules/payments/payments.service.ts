import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

const COMMISSION_RATE = 15; // 15%
const ESCROW_HOURS = 24;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    private readonly config: ConfigService,
  ) {}

  // ── Criar pagamento e chamar Pagar.me ──────────────────────────────────────
  async createPayment(amount: number, dto: CreatePaymentDto): Promise<Payment> {
    const existing = await this.paymentRepo.findOneBy({ requestId: dto.requestId });
    if (existing) throw new BadRequestException('Payment already exists for this request');

    const payment = this.paymentRepo.create({ requestId: dto.requestId, method: dto.method, amount, status: PaymentStatus.PROCESSING });
    const saved = await this.paymentRepo.save(payment);

    // Integração Pagar.me (ordem assíncrona)
    this.createPagarmeOrder(saved).catch((err) => this.logger.error('Pagar.me order error', err));

    return saved;
  }

  // ── Webhook Pagar.me ────────────────────────────────────────────────────────
  async handleWebhook(payload: Record<string, unknown>): Promise<void> {
    const type = payload.type as string;
    const data = payload.data as Record<string, unknown>;

    this.logger.log(`Webhook recebido: ${type}`);

    if (type === 'charge.paid') {
      const chargeId = data.id as string;
      const payment = await this.paymentRepo.findOneBy({ pagarmeChargeId: chargeId });
      if (payment) {
        payment.status = PaymentStatus.HELD;
        payment.paidAt = new Date();
        payment.heldAt = new Date();
        await this.paymentRepo.save(payment);
        // Agenda liberação automática após ESCROW_HOURS
        this.scheduleEscrowRelease(payment.id, ESCROW_HOURS);
      }
    }

    if (type === 'charge.payment_failed') {
      const chargeId = data.id as string;
      const payment = await this.paymentRepo.findOneBy({ pagarmeChargeId: chargeId });
      if (payment) {
        payment.status = PaymentStatus.FAILED;
        await this.paymentRepo.save(payment);
      }
    }
  }

  // ── Confirmar serviço (cliente) → inicia escrow de 24h ────────────────────
  async confirmByClient(requestId: string): Promise<Payment> {
    const payment = await this.findByRequest(requestId);
    if (payment.status !== PaymentStatus.HELD) throw new BadRequestException('Payment is not held in escrow');
    payment.heldAt = new Date();
    return this.paymentRepo.save(payment);
  }

  // ── Liberar escrow manualmente (admin ou após 24h) ─────────────────────────
  async releaseEscrow(requestId: string, professionalId: string): Promise<Transaction> {
    const payment = await this.findByRequest(requestId);
    if (payment.status !== PaymentStatus.HELD) throw new BadRequestException('Payment is not in escrow');

    const gross = Number(payment.amount);
    const commissionAmount = Number(((gross * COMMISSION_RATE) / 100).toFixed(2));
    const netAmount = Number((gross - commissionAmount).toFixed(2));

    // Marca pagamento como liberado
    payment.status = PaymentStatus.RELEASED;
    payment.releasedAt = new Date();
    await this.paymentRepo.save(payment);

    // Cria transação de repasse
    const tx = this.txRepo.create({
      paymentId: payment.id,
      professionalId,
      grossAmount: gross,
      commissionRate: COMMISSION_RATE,
      commissionAmount,
      netAmount,
      status: TransactionStatus.PENDING,
    });
    const savedTx = await this.txRepo.save(tx);

    // Dispara transferência no Pagar.me
    this.transferToProfessional(savedTx).catch((err) => this.logger.error('Pagar.me transfer error', err));

    return savedTx;
  }

  findByRequest(requestId: string): Promise<Payment> {
    return this.paymentRepo.findOneBy({ requestId }).then((p) => {
      if (!p) throw new NotFoundException(`Payment for request ${requestId} not found`);
      return p;
    });
  }

  findAllPayments(): Promise<Payment[]> {
    return this.paymentRepo.find({ order: { createdAt: 'DESC' } });
  }

  findAllTransactions(professionalId?: string): Promise<Transaction[]> {
    const where = professionalId ? { professionalId } : {};
    return this.txRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  // ── Pagar.me integration helpers ──────────────────────────────────────────
  private async createPagarmeOrder(payment: Payment): Promise<void> {
    // TODO: chamar SDK Pagar.me real
    // const pagarme = new PagarmeClient({ apiKey: this.config.get('app.pagarme.apiKey') });
    // const order = await pagarme.orders.create({ ... });
    this.logger.log(`[Pagar.me] Criando order para payment ${payment.id} — method: ${payment.method}`);

    // Simula resposta para dev
    payment.pagarmeOrderId = `order_${Date.now()}`;
    payment.pagarmeChargeId = `charge_${Date.now()}`;
    if (payment.method === PaymentMethod.PIX) {
      payment.pixCode = 'PIX_COPIA_E_COLA_AQUI';
      payment.pixQrCodeUrl = 'https://placeholder.qr.code/pix.png';
      payment.pixExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30min
    }
    payment.status = PaymentStatus.PROCESSING;
    await this.paymentRepo.save(payment);
  }

  private async transferToProfessional(tx: Transaction): Promise<void> {
    // TODO: chamar SDK Pagar.me para split/transferência real
    this.logger.log(`[Pagar.me] Transferindo R$ ${tx.netAmount} para profissional ${tx.professionalId}`);
    tx.pagarmeTransferId = `transfer_${Date.now()}`;
    tx.status = TransactionStatus.TRANSFERRED;
    tx.transferredAt = new Date();
    await this.txRepo.save(tx);
  }

  private scheduleEscrowRelease(paymentId: string, hours: number): void {
    // Em produção: usar Bull/BullMQ ou cron job
    // Simplificado aqui com setTimeout para MVP/dev
    const ms = hours * 60 * 60 * 1000;
    setTimeout(async () => {
      const payment = await this.paymentRepo.findOneBy({ id: paymentId });
      if (payment?.status === PaymentStatus.HELD) {
        this.logger.log(`[Escrow] Auto-releasing payment ${paymentId} after ${hours}h`);
        // Busca professionalId via request — simplificado
        payment.status = PaymentStatus.RELEASED;
        payment.releasedAt = new Date();
        await this.paymentRepo.save(payment);
      }
    }, ms);
  }
}
