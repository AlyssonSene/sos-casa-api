import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Review } from './entities/review.entity';

const mockReview: Review = {
  id: 'rev-1', requestId: 'req-1', clientId: 'cli-1', professionalId: 'prof-1',
  rating: 5, comment: 'Ótimo!', tags: ['pontual'], createdAt: new Date(), updatedAt: new Date(),
};

const mockRepo = { findOneBy: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() };

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsService, { provide: getRepositoryToken(Review), useValue: mockRepo }],
    }).compile();
    service = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
  });

  it('deve criar review', async () => {
    mockRepo.findOneBy.mockResolvedValue(null);
    mockRepo.create.mockReturnValue(mockReview);
    mockRepo.save.mockResolvedValue(mockReview);
    const result = await service.create('cli-1', { requestId: 'req-1', professionalId: 'prof-1', rating: 5 });
    expect(result.rating).toBe(5);
  });

  it('deve lançar ConflictException se review duplicada', async () => {
    mockRepo.findOneBy.mockResolvedValue(mockReview);
    await expect(service.create('cli-1', { requestId: 'req-1', professionalId: 'prof-1', rating: 4 }))
      .rejects.toThrow(ConflictException);
  });

  it('deve deletar review existente', async () => {
    mockRepo.findOneBy.mockResolvedValue(mockReview);
    mockRepo.delete.mockResolvedValue({ affected: 1 });
    await service.remove('rev-1');
    expect(mockRepo.delete).toHaveBeenCalledWith('rev-1');
  });

  it('deve lançar NotFoundException ao deletar review inexistente', async () => {
    mockRepo.findOneBy.mockResolvedValue(null);
    await expect(service.remove('nao-existe')).rejects.toThrow(NotFoundException);
  });
});
