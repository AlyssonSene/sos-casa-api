import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PaymentsService } from './payments.service'
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity'
import { Transaction, TransactionStatus } from './entities/transaction.entity'

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
}

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
}

const mockPaymentRepo = {
  findOneBy: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
}

const mockTxRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOneBy: jest.fn(),
}

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'app.stripe.secretKey') return 'sk_test_placeholder'
    if (key === 'app.stripe.webhookSecret') return 'whsec_test'
    return undefined
  }),
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PaymentsService', () => {
  let service: PaymentsService

  beforeEach(async () => {
    // Restore config mock BEFORE module compilation so _stripe is initialized
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'app.stripe.secretKey') return 'sk_test_placeholder'
      if (key === 'app.stripe.webhookSecret') return 'whsec_test'
      return undefined
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: mockPaymentRepo },
        { provide: getRepositoryToken(Transaction), useValue: mockTxRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<PaymentsService>(PaymentsService)
    // resetAllMocks clears Once queues from previous tests + implementations (config no longer needed)
    jest.resetAllMocks()
  })

  // ── createPayment ──────────────────────────────────────────────────────────

  describe('createPayment', () => {
    it('deve lançar BadRequestException se pagamento já existir', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue(mockPayment)

      await expect(
        service.createPayment(200, { requestId: 'req-1', method: PaymentMethod.STRIPE_CARD }),
      ).rejects.toThrow(BadRequestException)
    })

    it('deve criar pagamento Stripe CARD com sucesso', async () => {
      const processingPayment = { ...mockPayment, id: 'pay-new', status: PaymentStatus.PROCESSING }
      mockPaymentRepo.findOneBy
        .mockResolvedValueOnce(null) // verificação de duplicata
        .mockResolvedValueOnce(processingPayment) // findOneBy final após save
      mockPaymentRepo.create.mockReturnValue(processingPayment)
      mockPaymentRepo.save.mockResolvedValue(processingPayment)

      const stripeInstance = (service as any)._stripe
      jest.spyOn(stripeInstance.paymentIntents, 'create').mockResolvedValue({
        id: 'pi_test_new',
        client_secret: 'pi_test_new_secret',
      } as any)

      const result = await service.createPayment(200, {
        requestId: 'req-new',
        method: PaymentMethod.STRIPE_CARD,
      })

      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ stripePaymentIntentId: 'pi_test_new' }),
      )
      expect(result).toEqual(processingPayment)
    })

    it('deve criar PaymentIntent com payment_method_types pix para STRIPE_PIX', async () => {
      const pixProcessing = {
        ...mockPayment,
        id: 'pay-stripe-pix',
        method: PaymentMethod.STRIPE_PIX,
        status: PaymentStatus.PROCESSING,
      }
      mockPaymentRepo.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(pixProcessing)
      mockPaymentRepo.create.mockReturnValue(pixProcessing)
      mockPaymentRepo.save.mockResolvedValue(pixProcessing)

      const stripeInstance = (service as any)._stripe
      const createSpy = jest
        .spyOn(stripeInstance.paymentIntents, 'create')
        .mockResolvedValue({ id: 'pi_pix_123', client_secret: 'pi_pix_123_secret' } as any)

      await service.createPayment(200, {
        requestId: 'req-stripe-pix',
        method: PaymentMethod.STRIPE_PIX,
      })

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ payment_method_types: ['pix'] }),
      )
    })

    it('deve falhar em createStripePaymentIntent e marcar payment como FAILED', async () => {
      const processingPayment = { ...mockPayment, id: 'pay-err', status: PaymentStatus.PROCESSING }
      mockPaymentRepo.findOneBy.mockResolvedValueOnce(null)
      mockPaymentRepo.create.mockReturnValue(processingPayment)
      mockPaymentRepo.save.mockResolvedValue(processingPayment)

      const stripeInstance = (service as any)._stripe
      jest
        .spyOn(stripeInstance.paymentIntents, 'create')
        .mockRejectedValue(new Error('Stripe error'))

      await expect(
        service.createPayment(200, { requestId: 'req-err', method: PaymentMethod.STRIPE_CARD }),
      ).rejects.toThrow('Stripe error')

      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.FAILED }),
      )
    })

    it('deve criar pagamento PIX manual com snapshot da chave PIX', async () => {
      const pixPayment = { ...mockPixPayment, id: 'pay-new', status: PaymentStatus.PROCESSING }
      mockPaymentRepo.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(pixPayment)
      mockPaymentRepo.create.mockReturnValue(pixPayment)
      mockPaymentRepo.save.mockResolvedValue(pixPayment)

      await service.createPayment(
        200,
        { requestId: 'req-pix', method: PaymentMethod.MANUAL_PIX },
        '000.000.000-00',
        'cpf',
      )

      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ manualPixKey: '000.000.000-00', manualPixKeyType: 'cpf' }),
      )
    })

    it('deve falhar se PIX manual não tiver chave PIX cadastrada', async () => {
      const emptyPayment = { ...mockPixPayment }
      mockPaymentRepo.findOneBy.mockResolvedValueOnce(null)
      mockPaymentRepo.create.mockReturnValue(emptyPayment)
      mockPaymentRepo.save.mockResolvedValue(emptyPayment)

      await expect(
        service.createPayment(200, {
          requestId: 'req-pix-sem-chave',
          method: PaymentMethod.MANUAL_PIX,
        }),
        // sem pixKey e pixKeyType
      ).rejects.toThrow(BadRequestException)
    })
  })

  // ── submitPixReceipt ───────────────────────────────────────────────────────

  describe('submitPixReceipt', () => {
    it('deve registrar comprovante e mudar status para HELD', async () => {
      const processing = { ...mockPixPayment, status: PaymentStatus.PROCESSING }
      mockPaymentRepo.findOneBy.mockResolvedValue(processing)
      mockPaymentRepo.save.mockResolvedValue({
        ...processing,
        status: PaymentStatus.HELD,
        receiptAttachmentId: 'att-1',
      })

      await service.submitPixReceipt('req-pix-1', 'att-1')

      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.HELD, receiptAttachmentId: 'att-1' }),
      )
    })

    it('deve lançar BadRequestException se método não for MANUAL_PIX', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({
        ...mockPayment,
        method: PaymentMethod.STRIPE_CARD,
      })

      await expect(service.submitPixReceipt('req-1', 'att-1')).rejects.toThrow(BadRequestException)
    })

    it('deve lançar BadRequestException se status não for PROCESSING', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({ ...mockPixPayment, status: PaymentStatus.HELD })

      await expect(service.submitPixReceipt('req-pix-1', 'att-1')).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  // ── confirmPixByProfessional ───────────────────────────────────────────────

  describe('confirmPixByProfessional', () => {
    it('deve confirmar recebimento e mudar status para RELEASED', async () => {
      const held = { ...mockPixPayment, status: PaymentStatus.HELD, receiptAttachmentId: 'att-1' }
      mockPaymentRepo.findOneBy.mockResolvedValue(held)
      mockPaymentRepo.save.mockResolvedValue({ ...held, status: PaymentStatus.RELEASED })

      const savedTx = { id: 'tx-1', paymentId: 'pay-pix-1', commissionRate: 0, netAmount: 200 }
      mockTxRepo.create.mockReturnValue(savedTx)
      mockTxRepo.save.mockResolvedValue(savedTx)

      await service.confirmPixByProfessional('req-pix-1', 'prof-user-1')

      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.RELEASED }),
      )
      // Para PIX manual: sem comissão
      expect(mockTxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ commissionRate: 0, commissionAmount: 0 }),
      )
    })

    it('deve lançar BadRequestException se método não for MANUAL_PIX', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({
        ...mockPayment,
        method: PaymentMethod.STRIPE_CARD,
      })

      await expect(service.confirmPixByProfessional('req-1', 'prof-1')).rejects.toThrow(
        BadRequestException,
      )
    })

    it('deve lançar BadRequestException se não houver comprovante pendente (status != HELD)', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({
        ...mockPixPayment,
        status: PaymentStatus.PROCESSING,
      })

      await expect(service.confirmPixByProfessional('req-pix-1', 'prof-1')).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  // ── releaseEscrow (Stripe) ─────────────────────────────────────────────────

  describe('releaseEscrow', () => {
    it('deve criar transação com 15% de comissão para pagamento Stripe', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.HELD,
        amount: 200,
      })
      mockPaymentRepo.save.mockResolvedValue({ ...mockPayment, status: PaymentStatus.RELEASED })

      const savedTx = { id: 'tx-1', commissionRate: 15, commissionAmount: 30, netAmount: 170 }
      mockTxRepo.create.mockReturnValue(savedTx)
      mockTxRepo.save.mockResolvedValue(savedTx)

      await service.releaseEscrow('req-1', 'acct_stripe_pro')

      expect(mockTxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ commissionRate: 15, commissionAmount: 30, netAmount: 170 }),
      )
      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.RELEASED }),
      )
    })

    it('deve lançar BadRequestException para PIX manual', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({ ...mockPixPayment, status: PaymentStatus.HELD })

      await expect(service.releaseEscrow('req-pix-1', 'acct_stripe_pro')).rejects.toThrow(
        BadRequestException,
      )
    })

    it('deve lançar BadRequestException se não estiver em HELD', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.RELEASED,
      })

      await expect(service.releaseEscrow('req-1', 'acct_stripe_pro')).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  // ── findByRequest ──────────────────────────────────────────────────────────

  describe('findByRequest', () => {
    it('deve retornar pagamento pelo requestId', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue(mockPayment)
      const result = await service.findByRequest('req-1')
      expect(result.id).toBe('pay-1')
    })

    it('deve lançar NotFoundException se não encontrado', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue(null)
      await expect(service.findByRequest('nao-existe')).rejects.toThrow(NotFoundException)
    })
  })

  // ── findAllPayments / findAllTransactions ──────────────────────────────────

  describe('findAllPayments', () => {
    it('deve retornar todos os pagamentos', async () => {
      mockPaymentRepo.find.mockResolvedValue([mockPayment])
      const result = await service.findAllPayments()
      expect(result).toHaveLength(1)
      expect(mockPaymentRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } })
    })
  })

  describe('findAllTransactions', () => {
    it('deve retornar todas as transações', async () => {
      const mockTx = { id: 'tx-1', paymentId: 'pay-1', status: TransactionStatus.PENDING }
      mockTxRepo.find.mockResolvedValue([mockTx])
      const result = await service.findAllTransactions()
      expect(result).toHaveLength(1)
      expect(mockTxRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } })
    })
  })

  // ── handleStripeWebhook ────────────────────────────────────────────────────

  describe('handleStripeWebhook', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let stripeInstance: any

    beforeEach(() => {
      stripeInstance = (service as any)._stripe
    })

    it('deve processar payment_intent.succeeded e agendar escrow release', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123', latest_charge: 'ch_test_123' } },
      }
      jest.spyOn(stripeInstance.webhooks, 'constructEvent').mockReturnValue(mockEvent as any)
      mockPaymentRepo.findOneBy.mockResolvedValue({ ...mockPayment, status: PaymentStatus.HELD })
      mockPaymentRepo.save.mockResolvedValue(mockPayment)

      await service.handleStripeWebhook(Buffer.from('raw'), 'sig')

      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.HELD, paidAt: expect.any(Date) }),
      )
    })

    it('deve processar payment_intent.succeeded quando payment não existe no banco', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_unknown', latest_charge: null } },
      }
      jest.spyOn(stripeInstance.webhooks, 'constructEvent').mockReturnValue(mockEvent as any)
      mockPaymentRepo.findOneBy.mockResolvedValue(null)

      await service.handleStripeWebhook(Buffer.from('raw'), 'sig')

      expect(mockPaymentRepo.save).not.toHaveBeenCalled()
    })

    it('deve processar payment_intent.payment_failed', async () => {
      const mockEvent = {
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_test_123' } },
      }
      jest.spyOn(stripeInstance.webhooks, 'constructEvent').mockReturnValue(mockEvent as any)
      mockPaymentRepo.findOneBy.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.PROCESSING,
      })
      mockPaymentRepo.save.mockResolvedValue({ ...mockPayment, status: PaymentStatus.FAILED })

      await service.handleStripeWebhook(Buffer.from('raw'), 'sig')

      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.FAILED }),
      )
    })

    it('deve ignorar payment_intent.payment_failed quando payment não existe', async () => {
      const mockEvent = {
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_unknown' } },
      }
      jest.spyOn(stripeInstance.webhooks, 'constructEvent').mockReturnValue(mockEvent as any)
      mockPaymentRepo.findOneBy.mockResolvedValue(null)

      await service.handleStripeWebhook(Buffer.from('raw'), 'sig')

      expect(mockPaymentRepo.save).not.toHaveBeenCalled()
    })

    it('deve processar transfer.created', async () => {
      const mockEvent = {
        type: 'transfer.created',
        data: { object: { id: 'tr_test_123' } },
      }
      jest.spyOn(stripeInstance.webhooks, 'constructEvent').mockReturnValue(mockEvent as any)
      const mockTx = {
        id: 'tx-1',
        stripeTransferId: 'tr_test_123',
        status: TransactionStatus.PENDING,
        transferredAt: null,
      }
      mockTxRepo.findOneBy.mockResolvedValue(mockTx)
      mockTxRepo.save.mockResolvedValue({ ...mockTx, status: TransactionStatus.TRANSFERRED })

      await service.handleStripeWebhook(Buffer.from('raw'), 'sig')

      expect(mockTxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TransactionStatus.TRANSFERRED }),
      )
    })

    it('deve ignorar transfer.created quando tx não existe', async () => {
      const mockEvent = {
        type: 'transfer.created',
        data: { object: { id: 'tr_unknown' } },
      }
      jest.spyOn(stripeInstance.webhooks, 'constructEvent').mockReturnValue(mockEvent as any)
      mockTxRepo.findOneBy.mockResolvedValue(null)

      await service.handleStripeWebhook(Buffer.from('raw'), 'sig')

      expect(mockTxRepo.save).not.toHaveBeenCalled()
    })

    it('deve ignorar eventos desconhecidos (default case)', async () => {
      const mockEvent = { type: 'customer.created', data: { object: {} } }
      jest.spyOn(stripeInstance.webhooks, 'constructEvent').mockReturnValue(mockEvent as any)

      await service.handleStripeWebhook(Buffer.from('raw'), 'sig')

      expect(mockPaymentRepo.save).not.toHaveBeenCalled()
      expect(mockTxRepo.save).not.toHaveBeenCalled()
    })

    it('deve lançar BadRequestException se assinatura Stripe inválida', async () => {
      jest.spyOn(stripeInstance.webhooks, 'constructEvent').mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      await expect(service.handleStripeWebhook(Buffer.from('raw'), 'bad-sig')).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  // ── get stripe() sem chave ─────────────────────────────────────────────────

  describe('get stripe() — sem STRIPE_SECRET_KEY', () => {
    let serviceNoStripe: PaymentsService

    beforeEach(async () => {
      const noKeyConfig = { get: jest.fn().mockReturnValue('') }
      const mod = await Test.createTestingModule({
        providers: [
          PaymentsService,
          { provide: getRepositoryToken(Payment), useValue: mockPaymentRepo },
          { provide: getRepositoryToken(Transaction), useValue: mockTxRepo },
          { provide: ConfigService, useValue: noKeyConfig },
        ],
      }).compile()
      serviceNoStripe = mod.get<PaymentsService>(PaymentsService)
    })

    it('deve lançar BadRequestException ao usar método que depende de Stripe', async () => {
      await expect(serviceNoStripe.handleStripeWebhook(Buffer.from('raw'), 'sig')).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  // ── transferViaStripe (via releaseEscrow) ──────────────────────────────────

  describe('transferViaStripe', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let stripeInstance: any

    beforeEach(() => {
      stripeInstance = (service as any)._stripe
    })

    it('deve atualizar tx com stripeTransferId ao transferir com sucesso', async () => {
      const heldPayment = { ...mockPayment, status: PaymentStatus.HELD, amount: 200 }
      mockPaymentRepo.findOneBy.mockResolvedValue(heldPayment)
      mockPaymentRepo.save.mockResolvedValue({ ...heldPayment, status: PaymentStatus.RELEASED })

      const savedTx = {
        id: 'tx-1',
        commissionRate: 15,
        commissionAmount: 30,
        netAmount: 170,
        stripeTransferId: null,
        status: TransactionStatus.PENDING,
      }
      mockTxRepo.create.mockReturnValue(savedTx)
      mockTxRepo.save.mockResolvedValue(savedTx)

      jest
        .spyOn(stripeInstance.transfers, 'create')
        .mockResolvedValue({ id: 'tr_success_123' } as any)

      await service.releaseEscrow('req-1', 'acct_stripe_pro')

      // Allow microtasks to flush (fire-and-forget .catch)
      await Promise.resolve()
      await Promise.resolve()

      expect(mockTxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          stripeTransferId: 'tr_success_123',
          status: TransactionStatus.PROCESSING,
        }),
      )
    })

    it('deve marcar tx como FAILED quando transferência Stripe falha', async () => {
      const heldPayment = { ...mockPayment, status: PaymentStatus.HELD, amount: 200 }
      mockPaymentRepo.findOneBy.mockResolvedValue(heldPayment)
      mockPaymentRepo.save.mockResolvedValue({ ...heldPayment, status: PaymentStatus.RELEASED })

      const savedTx = {
        id: 'tx-2',
        commissionRate: 15,
        commissionAmount: 30,
        netAmount: 170,
        stripeTransferId: null,
        status: TransactionStatus.PENDING,
      }
      mockTxRepo.create.mockReturnValue(savedTx)
      mockTxRepo.save.mockResolvedValue(savedTx)

      jest.spyOn(stripeInstance.transfers, 'create').mockRejectedValue(new Error('Transfer failed'))

      await service.releaseEscrow('req-2', 'acct_stripe_pro')

      // Allow microtasks to flush (fire-and-forget .catch)
      await Promise.resolve()
      await Promise.resolve()

      expect(mockTxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TransactionStatus.FAILED }),
      )
    })
  })

  // ── scheduleEscrowRelease ──────────────────────────────────────────────────

  describe('scheduleEscrowRelease', () => {
    beforeAll(() => {
      jest.useFakeTimers()
    })

    afterAll(() => {
      jest.useRealTimers()
    })

    it('deve liberar pagamento HELD automaticamente após o timeout', async () => {
      const heldPayment = {
        ...mockPayment,
        requestId: 'req-escrow',
        status: PaymentStatus.HELD,
      }
      mockPaymentRepo.findOneBy.mockResolvedValue(heldPayment)
      mockPaymentRepo.save.mockResolvedValue({ ...heldPayment, status: PaymentStatus.RELEASED })

      ;(service as any).scheduleEscrowRelease('req-escrow', 24)

      await jest.runAllTimersAsync()

      expect(mockPaymentRepo.findOneBy).toHaveBeenCalledWith({ requestId: 'req-escrow' })
      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.RELEASED, releasedAt: expect.any(Date) }),
      )
    })

    it('não deve salvar se payment não estiver em HELD', async () => {
      const releasedPayment = {
        ...mockPayment,
        requestId: 'req-already-released',
        status: PaymentStatus.RELEASED,
      }
      mockPaymentRepo.findOneBy.mockResolvedValue(releasedPayment)

      ;(service as any).scheduleEscrowRelease('req-already-released', 24)

      await jest.runAllTimersAsync()

      expect(mockPaymentRepo.save).not.toHaveBeenCalled()
    })

    it('não deve salvar se payment for null', async () => {
      mockPaymentRepo.findOneBy.mockResolvedValue(null)

      ;(service as any).scheduleEscrowRelease('req-null', 24)

      await jest.runAllTimersAsync()

      expect(mockPaymentRepo.save).not.toHaveBeenCalled()
    })
  })
})
