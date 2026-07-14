import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ServiceRequestsService } from './service-requests.service'
import { ServiceRequest } from './entities/service-request.entity'
import { RequestStatus } from '../../common/enums/request-status.enum'

const makeRequest = (status: RequestStatus): ServiceRequest => ({
  id: 'req-1',
  clientId: 'client-1',
  addressId: 'addr-1',
  professionalId: null,
  status,
  urgency: 'normal',
  description: 'Consertar torneira',
  materialProvider: 'client',
  materialValue: 0,
  subtotal: 100,
  travelFee: 10,
  platformFee: 15,
  total: 125,
  cancelledBy: null,
  cancellationReason: null,
  acceptedAt: null,
  onTheWayAt: null,
  arrivedAt: null,
  startedAt: null,
  completedAt: null,
  confirmedAt: null,
  paidAt: null,
  finalizedAt: null,
  cancelledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  client: null as any,
})

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
}

const mockEmitter = { emit: jest.fn() }

describe('ServiceRequestsService', () => {
  let service: ServiceRequestsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceRequestsService,
        { provide: getRepositoryToken(ServiceRequest), useValue: mockRepo },
        { provide: EventEmitter2, useValue: mockEmitter },
      ],
    }).compile()

    service = module.get<ServiceRequestsService>(ServiceRequestsService)
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('deve retornar todas as solicitações sem filtro', async () => {
      const req = makeRequest(RequestStatus.PENDING)
      mockRepo.find.mockResolvedValue([req])

      const result = await service.findAll()

      expect(mockRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: {} }))
      expect(result).toHaveLength(1)
    })

    it('deve filtrar por status quando filtro fornecido', async () => {
      const req = makeRequest(RequestStatus.ACCEPTED)
      mockRepo.find.mockResolvedValue([req])

      await service.findAll({ status: RequestStatus.ACCEPTED })

      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: RequestStatus.ACCEPTED } }),
      )
    })
  })

  describe('findById', () => {
    it('deve retornar a solicitação pelo id', async () => {
      mockRepo.findOne.mockResolvedValue(makeRequest(RequestStatus.PENDING))
      const result = await service.findById('req-1')
      expect(result.id).toBe('req-1')
    })

    it('deve lançar NotFoundException se não encontrada', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      await expect(service.findById('nao-existe')).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateStatus', () => {
    it('deve atualizar status e emitir evento', async () => {
      const req = makeRequest(RequestStatus.PENDING)
      mockRepo.findOne.mockResolvedValue(req)
      mockRepo.save.mockResolvedValue({ ...req, status: RequestStatus.ACCEPTED })

      await service.updateStatus('req-1', RequestStatus.ACCEPTED)

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: RequestStatus.ACCEPTED }),
      )
      expect(mockEmitter.emit).toHaveBeenCalledWith('service_request.accepted', expect.any(Object))
    })
  })

  describe('cancel', () => {
    it('deve cancelar solicitação em status PENDING', async () => {
      const req = makeRequest(RequestStatus.PENDING)
      mockRepo.findOne.mockResolvedValue(req)
      mockRepo.save.mockResolvedValue({ ...req, status: RequestStatus.CANCELLED })

      await service.cancel('req-1', 'client-1', 'Desisti')
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: RequestStatus.CANCELLED, cancellationReason: 'Desisti' }),
      )
    })

    it('deve lançar BadRequestException se status não permitir cancelamento', async () => {
      const req = makeRequest(RequestStatus.IN_PROGRESS)
      mockRepo.findOne.mockResolvedValue(req)

      await expect(service.cancel('req-1', 'client-1')).rejects.toThrow(BadRequestException)
    })

    it('deve cancelar solicitação em status ACCEPTED', async () => {
      const req = makeRequest(RequestStatus.ACCEPTED)
      mockRepo.findOne.mockResolvedValue(req)
      mockRepo.save.mockResolvedValue({ ...req, status: RequestStatus.CANCELLED })

      await service.cancel('req-1', 'client-1')
      expect(mockRepo.save).toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('deve criar solicitação com clientId', async () => {
      const req = makeRequest(RequestStatus.PENDING)
      mockRepo.create.mockReturnValue(req)
      mockRepo.save.mockResolvedValue(req)

      await service.create({ clientId: 'client-1', addressId: 'addr-1' })
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'client-1' }),
      )
    })
  })
})
