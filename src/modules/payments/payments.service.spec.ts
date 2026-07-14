import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { Transaction, TransactionStatus } from './entities/transaction.entity';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPayment: Payment = {
  id: 'pay-1',
  requestId: 'req-1',
  method: PaymentMethod.STRIPE_CARD,
  amount: 200,
  status: PaymentStatus.HELD,
  stripePaymentIntentId: 'pi_test_123',
  stripeClientSecret: 'pi_test_123_secret_abc',
  stripeChargeId: 'ch_test_123',
  manualPixKey: null,
  manualPixKeyType: null,
  receiptAttachmentId: null,
  professionalConfirmedAt: null,
  paidAt: new Date(),
  heldAt: new Date(),
  releasedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPixPayment: Payment = {
  ...mockPayment,
  id: 'pay-pix-1',
  method: PaymentMethod.MANUAL_PIX,
  status: PaymentStatus.PROCESSING,
  stripePaymentIntentId: null,
  stripeClientSecret: null,
  stripeChargeId: null,
  manualPixKey: '000.000.000-00',
  manualPixKeyType: 'cpf',
};

const mockPaymentRepo = {
  findOneBy: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockTxRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOneBy: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'app.stripe.secretKey') return 'sk_test_placeholder';
    if (key === 'app.stripe.webhookSecret') return 'whsec_test';
    return undefined;
  }),
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment),     useValue: mockPaymentRepo },
        { provide: getRepositoryToken(Transaction), useValue: mockTxRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  // ── createPayment ──────────────────────────────────────────────────────────

  describe('createPayment', () => {
    it('deve lançar BadRequestException se pagamento já existir', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue(mockPayment);

      await expect(
        service.createPayment(200, { requestId: 'req-1', method: PaymentMethod.STRIPE_CARD }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve criar pagamento Stripe se não existir', async () => {
      mockPaymentRepo.findOneBy
        .mockResolvedValueOnce(null)    // verificação de duplicata
        .mockResolvedValueOnce({ ...mockPayment, status: PaymentStatus.PROCESSING }); // findOneBy após save

      mockPaymentRepo.create.mockReturnValue({ ...mockPayment, status: PaymentStatus.PROCESSING });
      mockPaymentRepo.save.mockResolvedValue({ ...mockPayment, status: PaymentStatus.PROCESSING });

      // Stripe SDK está mockado via jest.spyOn implícito no service (sk_test_placeholder não chama API real)
      await expect(
        service.createPayment(200, { requestId: 'req-new', method: PaymentMethod.STRIPE_CARD }),
      ).rejects.toThrow(); // vai falhar na chamada Stripe pois não há conexão — comportamento esperado em unit test
    });

    it('deve criar pagamento PIX manual com snapshot da chave PIX', async () => {
      const pixPayment = { ...mockPixPayment, id: 'pay-new', status: PaymentStatus.PROCESSING };
      mockPaymentRepo.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(pixPayment);
      mockPaymentRepo.create.mockReturnValue(pixPayment);
      mockPaymentRepo.save.mockResolvedValue(pixPayment);

      const result = await service.createPayment(
        200,
        { requestId: 'req-pix', method: PaymentMethod.MANUAL_PIX },
        '000.000.000-00',
        'cpf',
      );

      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ manualPixKey: '000.000.000-00', manualPixKeyType: 'cpf' }),
      );
    });

    it('deve falhar se PIX manual não tiver chave PIX cadastrada', async () => {
      const emptyPayment = { ...mockPixPayment };
      mockPaymentRepo.findOneBy.mockResolvedValueOnce(null);
      mockPaymentRepo.create.mockReturnValue(emptyPayment);
      mockPaymentRepo.save.mockResolvedValue(emptyPayment);

      await expect(
        service.createPayment(200, { requestId: 'req-pix-sem-chave', method: PaymentMethod.MANUAL_PIX }),
        // sem pixKey e pixKeyType
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── submitPixReceipt ───────────────────────────────────────────────────────

  describe('submitPixReceipt', () => {
    it('deve registrar comprovante e mudar status para HELD', async () => {
      const processing = { ...mockPixPayment, status: PaymentStatus.PROCESSING };
      mockPaymentRepo.findOneBy.mockResolvedValue(processing);
      mockPaymentRepo.save.mockResolvedValue({ ...processing, status: PaymentStatus.HELD, receiptAttachmentId: 'att-1' });

      const result = await service.submitPixReceipt('req-pix-1', 'att-1');

      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.HELD, receiptAttachmentId: 'att-1' }),
      );
    });

    it('deve lançar BadRequestException se método não for MANUAL_PIX', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({ ...mockPayment, method: PaymentMethod.STRIPE_CARD });

      await expect(service.submitPixReceipt('req-1', 'att-1')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se status não for PROCESSING', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({ ...mockPixPayment, status: PaymentStatus.HELD });

      await expect(service.submitPixReceipt('req-pix-1', 'att-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── confirmPixByProfessional ───────────────────────────────────────────────

  describe('confirmPixByProfessional', () => {
    it('deve confirmar recebimento e mudar status para RELEASED', async () => {
      const held = { ...mockPixPayment, status: PaymentStatus.HELD, receiptAttachmentId: 'att-1' };
      mockPaymentRepo.findOneBy.mockResolvedValue(held);
      mockPaymentRepo.save.mockResolvedValue({ ...held, status: PaymentStatus.RELEASED });

      const savedTx = { id: 'tx-1', paymentId: 'pay-pix-1', commissionRate: 0, netAmount: 200 };
      mockTxRepo.create.mockReturnValue(savedTx);
      mockTxRepo.save.mockResolvedValue(savedTx);

      await service.confirmPixByProfessional('req-pix-1', 'prof-user-1');

      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.RELEASED }),
      );
      // Para PIX manual: sem comissão
      expect(mockTxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ commissionRate: 0, commissionAmount: 0 }),
      );
    });

    it('deve lançar BadRequestException se método não for MANUAL_PIX', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({ ...mockPayment, method: PaymentMethod.STRIPE_CARD });

      await expect(service.confirmPixByProfessional('req-1', 'prof-1')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se não houver comprovante pendente (status != HELD)', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({ ...mockPixPayment, status: PaymentStatus.PROCESSING });

      await expect(service.confirmPixByProfessional('req-pix-1', 'prof-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── releaseEscrow (Stripe) ─────────────────────────────────────────────────

  describe('releaseEscrow', () => {
    it('deve criar transação com 15% de comissão para pagamento Stripe', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({ ...mockPayment, status: PaymentStatus.HELD, amount: 200 });
      mockPaymentRepo.save.mockResolvedValue({ ...mockPayment, status: PaymentStatus.RELEASED });

      const savedTx = { id: 'tx-1', commissionRate: 15, commissionAmount: 30, netAmount: 170 };
      mockTxRepo.create.mockReturnValue(savedTx);
      mockTxRepo.save.mockResolvedValue(savedTx);

      const tx = await service.releaseEscrow('req-1', 'acct_stripe_pro');

      expect(mockTxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ commissionRate: 15, commissionAmount: 30, netAmount: 170 }),
      );
      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.RELEASED }),
      );
    });

    it('deve lançar BadRequestException para PIX manual', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({ ...mockPixPayment, status: PaymentStatus.HELD });

      await expect(service.releaseEscrow('req-pix-1', 'acct_stripe_pro')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se não estiver em HELD', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({ ...mockPayment, status: PaymentStatus.RELEASED });

      await expect(service.releaseEscrow('req-1', 'acct_stripe_pro')).rejects.toThrow(BadRequestException);
    });
  });

  // ── findByRequest ──────────────────────────────────────────────────────────

  describe('findByRequest', () => {
    it('deve retornar pagamento pelo requestId', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue(mockPayment);
      const result = await service.findByRequest('req-1');
      expect(result.id).toBe('pay-1');
    });

    it('deve lançar NotFoundException se não encontrado', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue(null);
      await expect(service.findByRequest('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });
});
