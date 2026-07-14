import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { Transaction, TransactionStatus } from './entities/transaction.entity';

const mockPayment: Payment = {
  id: 'pay-1',
  requestId: 'req-1',
  gateway: 'pagarme',
  pagarmeOrderId: 'order_123',
  pagarmeChargeId: 'charge_123',
  method: PaymentMethod.PIX,
  amount: 200,
  status: PaymentStatus.HELD,
  pixCode: 'PIX123',
  pixQrCodeUrl: null,
  pixExpiresAt: null,
  paidAt: new Date(),
  heldAt: new Date(),
  releasedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPaymentRepo = {
  findOneBy: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockTxRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: mockPaymentRepo },
        { provide: getRepositoryToken(Transaction), useValue: mockTxRepo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('deve lançar BadRequestException se pagamento já existir', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue(mockPayment);

      await expect(
        service.createPayment(200, { requestId: 'req-1', method: PaymentMethod.PIX }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve criar pagamento se não existir', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue(null);
      mockPaymentRepo.create.mockReturnValue({ ...mockPayment, status: PaymentStatus.PROCESSING });
      mockPaymentRepo.save.mockResolvedValue({ ...mockPayment, status: PaymentStatus.PROCESSING });

      const result = await service.createPayment(200, { requestId: 'req-new', method: PaymentMethod.PIX });
      expect(mockPaymentRepo.save).toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.PROCESSING);
    });
  });

  describe('releaseEscrow', () => {
    it('deve liberar escrow e criar transação com comissão de 15%', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({ ...mockPayment, status: PaymentStatus.HELD, amount: 200 });
      mockPaymentRepo.save.mockResolvedValue({ ...mockPayment, status: PaymentStatus.RELEASED });
      const savedTx = {
        id: 'tx-1',
        paymentId: 'pay-1',
        professionalId: 'prof-1',
        grossAmount: 200,
        commissionRate: 15,
        commissionAmount: 30,
        netAmount: 170,
        status: TransactionStatus.PENDING,
      };
      mockTxRepo.create.mockReturnValue(savedTx);
      mockTxRepo.save.mockResolvedValue(savedTx);

      const tx = await service.releaseEscrow('req-1', 'prof-1');

      expect(tx.commissionRate).toBe(15);
      expect(tx.commissionAmount).toBe(30);
      expect(tx.netAmount).toBe(170);
      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.RELEASED }),
      );
    });

    it('deve lançar BadRequestException se status não for HELD', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({ ...mockPayment, status: PaymentStatus.RELEASED });

      await expect(service.releaseEscrow('req-1', 'prof-1')).rejects.toThrow(BadRequestException);
    });
  });

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

  describe('handleWebhook', () => {
    it('deve marcar pagamento como HELD ao receber charge.paid', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({ ...mockPayment, status: PaymentStatus.PROCESSING });
      mockPaymentRepo.save.mockResolvedValue({ ...mockPayment, status: PaymentStatus.HELD });

      await service.handleWebhook({ type: 'charge.paid', data: { id: 'charge_123' } });

      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.HELD }),
      );
    });

    it('deve marcar pagamento como FAILED ao receber charge.payment_failed', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({ ...mockPayment, status: PaymentStatus.PROCESSING });
      mockPaymentRepo.save.mockResolvedValue({ ...mockPayment, status: PaymentStatus.FAILED });

      await service.handleWebhook({ type: 'charge.payment_failed', data: { id: 'charge_123' } });

      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.FAILED }),
      );
    });
  });
});
