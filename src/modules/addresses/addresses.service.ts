import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class AddressesService {
  constructor(@InjectRepository(Address) private readonly repo: Repository<Address>) {}

  findByUser(userId: string): Promise<Address[]> {
    return this.repo.find({ where: { userId }, order: { isDefault: 'DESC', createdAt: 'ASC' } });
  }

  async findById(id: string, userId?: string): Promise<Address> {
    const where = userId ? { id, userId } : { id };
    const addr = await this.repo.findOneBy(where);
    if (!addr) throw new NotFoundException(`Address ${id} not found`);
    return addr;
  }

  async create(userId: string, dto: CreateAddressDto): Promise<Address> {
    if (dto.isDefault) await this.repo.update({ userId }, { isDefault: false });
    const address = this.repo.create({ ...dto, userId });
    return this.repo.save(address);
  }

  async update(id: string, userId: string, dto: Partial<CreateAddressDto>): Promise<Address> {
    const address = await this.findById(id, userId);
    if (dto.isDefault) await this.repo.update({ userId }, { isDefault: false });
    Object.assign(address, dto);
    return this.repo.save(address);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findById(id, userId);
    await this.repo.delete(id);
  }
}
