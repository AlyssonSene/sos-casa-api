import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ServiceRequest } from './entities/service-request.entity';
import { RequestStatus } from '../../common/enums/request-status.enum';

@Injectable()
export class ServiceRequestsService {
  constructor(
    @InjectRepository(ServiceRequest)
    private readonly repo: Repository<ServiceRequest>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  findAll(filters?: Partial<{ status: RequestStatus; clientId: string; professionalId: string }>): Promise<ServiceRequest[]> {
    return this.repo.find({ where: filters ?? {}, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<ServiceRequest> {
    const req = await this.repo.findOne({ where: { id }, relations: { client: true } });
    if (!req) throw new NotFoundException(`ServiceRequest ${id} not found`);
    return req;
  }

  create(data: Partial<ServiceRequest>): Promise<ServiceRequest> {
    const request = this.repo.create(data);
    return this.repo.save(request);
  }

  async updateStatus(id: string, status: RequestStatus, extra?: Partial<ServiceRequest>): Promise<ServiceRequest> {
    const request = await this.findById(id);
    Object.assign(request, { status, ...extra });
    const saved = await this.repo.save(request);
    this.eventEmitter.emit(`service_request.${status}`, saved);
    return saved;
  }

  async cancel(id: string, cancelledBy: string, reason?: string): Promise<ServiceRequest> {
    const request = await this.findById(id);
    const cancellableStatuses = [RequestStatus.PENDING, RequestStatus.SEARCHING, RequestStatus.ACCEPTED, RequestStatus.ON_THE_WAY, RequestStatus.ARRIVED];
    if (!cancellableStatuses.includes(request.status)) {
      throw new BadRequestException(`Cannot cancel request in status ${request.status}`);
    }
    return this.updateStatus(id, RequestStatus.CANCELLED, {
      cancelledBy,
      cancellationReason: reason ?? null,
      cancelledAt: new Date(),
    });
  }
}
