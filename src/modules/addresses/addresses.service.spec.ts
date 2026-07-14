import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { AddressesService } from './addresses.service'
import { Address } from './entities/address.entity'
import { CreateAddressDto } from './dto/create-address.dto'

const mockAddress: Address = {
  id: 'addr-1',
  userId: 'user-1',
  label: 'Casa',
  street: 'Rua das Flores',
  number: '123',
  complement: null,
  neighborhood: 'Centro',
  city: 'Varginha',
  state: 'MG',
  zipCode: '37010-000',
  latitude: null,
  longitude: null,
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: null as any,
}

const mockRepo = {
  find: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

describe('AddressesService', () => {
  let service: AddressesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AddressesService, { provide: getRepositoryToken(Address), useValue: mockRepo }],
    }).compile()

    service = module.get<AddressesService>(AddressesService)
    jest.clearAllMocks()
  })

  describe('findByUser', () => {
    it('deve retornar endereços do usuário', async () => {
      mockRepo.find.mockResolvedValue([mockAddress])
      const result = await service.findByUser('user-1')
      expect(result).toHaveLength(1)
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      )
    })
  })

  describe('findById', () => {
    it('deve retornar o endereço pelo id', async () => {
      mockRepo.findOneBy.mockResolvedValue(mockAddress)
      const result = await service.findById('addr-1', 'user-1')
      expect(result.id).toBe('addr-1')
    })

    it('deve lançar NotFoundException se não encontrado', async () => {
      mockRepo.findOneBy.mockResolvedValue(null)
      await expect(service.findById('nao-existe', 'user-1')).rejects.toThrow(NotFoundException)
    })

    it('deve buscar apenas por id quando userId não for informado', async () => {
      mockRepo.findOneBy.mockResolvedValue(mockAddress)
      const result = await service.findById('addr-1')
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: 'addr-1' })
      expect(result.id).toBe('addr-1')
    })
  })

  describe('create', () => {
    it('deve criar endereço padrão e desmarcar os anteriores', async () => {
      const dto: CreateAddressDto = {
        street: 'Nova Rua',
        number: '1',
        neighborhood: 'Bairro',
        city: 'Cidade',
        state: 'SP',
        zipCode: '01000-000',
        isDefault: true,
      }

      mockRepo.create.mockReturnValue({ ...dto, userId: 'user-1' })
      mockRepo.save.mockResolvedValue({ id: 'addr-new', ...dto, userId: 'user-1' })

      const result = await service.create('user-1', dto)

      // deve ter chamado update para desmarcar isDefault anterior
      expect(mockRepo.update).toHaveBeenCalledWith({ userId: 'user-1' }, { isDefault: false })
      expect(result.id).toBe('addr-new')
    })

    it('não deve chamar update se isDefault for false', async () => {
      const dto: CreateAddressDto = {
        street: 'Rua X',
        number: '2',
        neighborhood: 'B',
        city: 'C',
        state: 'MG',
        zipCode: '37000-000',
        isDefault: false,
      }
      mockRepo.create.mockReturnValue(dto)
      mockRepo.save.mockResolvedValue({ id: 'addr-2', ...dto })

      await service.create('user-1', dto)
      expect(mockRepo.update).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('deve atualizar endereço e desmarcar isDefault anterior quando isDefault=true', async () => {
      mockRepo.findOneBy.mockResolvedValue(mockAddress)
      mockRepo.save.mockResolvedValue({ ...mockAddress, city: 'Nova Cidade', isDefault: true })

      const result = await service.update('addr-1', 'user-1', {
        city: 'Nova Cidade',
        isDefault: true,
      })

      expect(mockRepo.update).toHaveBeenCalledWith({ userId: 'user-1' }, { isDefault: false })
      expect(mockRepo.save).toHaveBeenCalled()
      expect(result.city).toBe('Nova Cidade')
    })

    it('não deve chamar update se isDefault não for definido', async () => {
      mockRepo.findOneBy.mockResolvedValue(mockAddress)
      mockRepo.save.mockResolvedValue({ ...mockAddress, city: 'Nova Cidade' })

      await service.update('addr-1', 'user-1', { city: 'Nova Cidade' })

      expect(mockRepo.update).not.toHaveBeenCalled()
      expect(mockRepo.save).toHaveBeenCalled()
    })

    it('deve lançar NotFoundException se endereço não encontrado', async () => {
      mockRepo.findOneBy.mockResolvedValue(null)
      await expect(service.update('nao-existe', 'user-1', {})).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('deve deletar o endereço', async () => {
      mockRepo.findOneBy.mockResolvedValue(mockAddress)
      mockRepo.delete.mockResolvedValue({ affected: 1 })
      await service.remove('addr-1', 'user-1')
      expect(mockRepo.delete).toHaveBeenCalledWith('addr-1')
    })

    it('deve lançar NotFoundException se endereço não pertencer ao usuário', async () => {
      mockRepo.findOneBy.mockResolvedValue(null)
      await expect(service.remove('addr-1', 'outro-user')).rejects.toThrow(NotFoundException)
    })
  })
})
