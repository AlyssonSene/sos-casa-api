import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceRequestsService } from './service-requests.service';
import { ServiceRequest } from './entities/service-request.entity';
import { User } from '../users/entities/user.entity';
import { Address } from '../addresses/entities/address.entity';
import { RequestStatus } from '../../common/enums/request-status.enum';
import appConfig from '../../config/app.config';
import databaseConfig from '../../config/database.config';
import jwtConfig from '../../config/jwt.config';

/**
 * Testes de integração — ServiceRequestsService + TypeORM reais
 *
 * Requer: PostgreSQL em DB_NAME=sos_casa_test (configurado em .env.test)
 * Rodar: npx jest --testPathPattern=service-requests.integration
 */
describe('ServiceRequestsService (integração)', () => {
  let module: TestingModule;
  let service: ServiceRequestsService;
  let requestRepo: Repository<ServiceRequest>;
  let userRepo: Repository<User>;
  let addressRepo: Repository<Address>;
  let emitter: EventEmitter2;

  let testClientId: string;
  let testAddressId: string;
  let testRequestId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, databaseConfig, jwtConfig],
          envFilePath: '.env.test',
        }),
        EventEmitterModule.forRoot(),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (cfg: ConfigService) => ({
            type: 'postgres' as const,
            host: cfg.get<string>('database.host') ?? 'localhost',
            port: cfg.get<number>('database.port') ?? 5432,
            username: cfg.get<string>('database.user') ?? 'postgres',
            password: cfg.get<string>('database.pass') ?? 'postgres',
            database: cfg.get<string>('database.name') ?? 'sos_casa_test',
            entities: [ServiceRequest, User, Address],
            synchronize: true,
          }),
        }),
        TypeOrmModule.forFeature([ServiceRequest, User, Address]),
      ],
      providers: [ServiceRequestsService],
    }).compile();

    service = module.get<ServiceRequestsService>(ServiceRequestsService);
    requestRepo = module.get<Repository<ServiceRequest>>(getRepositoryToken(ServiceRequest));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    addressRepo = module.get<Repository<Address>>(getRepositoryToken(Address));
    emitter = module.get<EventEmitter2>(EventEmitter2);

    // ── Seed: cria usuário e endereço para usar nos testes ──────────────────
    const user = userRepo.create({
      name: 'Cliente Integração',
      email: `integ_sr_${Date.now()}@test.com`,
      phone: `119${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: 'hash_fake',
    });
    const savedUser = await userRepo.save(user);
    testClientId = savedUser.id;

    const address = addressRepo.create({
      userId: testClientId,
      street: 'Rua de Teste',
      number: '1',
      neighborhood: 'Centro',
      city: 'Varginha',
      state: 'MG',
      zipCode: '37010-000',
      isDefault: true,
    });
    const savedAddress = await addressRepo.save(address);
    testAddressId = savedAddress.id;
  });

  afterAll(async () => {
    // Limpa registros criados nos testes
    if (testRequestId) await requestRepo.delete({ id: testRequestId });
    if (testAddressId) await addressRepo.delete({ id: testAddressId });
    if (testClientId) await userRepo.delete({ id: testClientId });
    await module.close();
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('deve criar solicitação com status PENDING', async () => {
      const req = await service.create({
        clientId: testClientId,
        addressId: testAddressId,
        description: 'Teste integração - torneira quebrada',
        urgency: 'normal' as any,
        materialProvider: 'client' as any,
      });

      testRequestId = req.id;

      expect(req.id).toBeDefined();
      expect(req.status).toBe(RequestStatus.PENDING);
      expect(req.clientId).toBe(testClientId);
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('deve recuperar solicitação pelo id', async () => {
      const req = await service.findById(testRequestId);
      expect(req.id).toBe(testRequestId);
      expect(req.status).toBe(RequestStatus.PENDING);
    });

    it('deve lançar NotFoundException para id inexistente', async () => {
      await expect(
        service.findById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateStatus ──────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('deve persistir novo status no banco', async () => {
      const emitSpy = jest.spyOn(emitter, 'emit');

      await service.updateStatus(testRequestId, RequestStatus.SEARCHING);

      const updated = await service.findById(testRequestId);
      expect(updated.status).toBe(RequestStatus.SEARCHING);
      expect(emitSpy).toHaveBeenCalledWith(
        'service_request.searching',
        expect.any(Object),
      );
    });

    it('deve emitir evento correto ao mudar para ACCEPTED', async () => {
      const emitSpy = jest.spyOn(emitter, 'emit');
      await service.updateStatus(testRequestId, RequestStatus.ACCEPTED);

      expect(emitSpy).toHaveBeenCalledWith(
        'service_request.accepted',
        expect.objectContaining({ id: testRequestId }),
      );
    });
  });

  // ── cancel ────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    let cancelableRequestId: string;

    beforeAll(async () => {
      // Cria nova solicitação em PENDING para testar cancelamento
      const req = await service.create({
        clientId: testClientId,
        addressId: testAddressId,
        description: 'Para cancelar',
        urgency: 'normal' as any,
        materialProvider: 'client' as any,
      });
      cancelableRequestId = req.id;
    });

    afterAll(async () => {
      await requestRepo.delete({ id: cancelableRequestId });
    });

    it('deve cancelar solicitação em PENDING', async () => {
      await service.cancel(cancelableRequestId, testClientId, 'Mudei de ideia');
      const req = await service.findById(cancelableRequestId);
      expect(req.status).toBe(RequestStatus.CANCELLED);
      expect(req.cancellationReason).toBe('Mudei de ideia');
    });

    it('deve lançar BadRequestException ao tentar cancelar IN_PROGRESS', async () => {
      // Forçar status IN_PROGRESS diretamente no repo
      await requestRepo.update(testRequestId, { status: RequestStatus.IN_PROGRESS });

      await expect(
        service.cancel(testRequestId, testClientId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
