import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Transaction } from './entities/transaction.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ProfessionalsModule } from '../professionals/professionals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Transaction]),
    ProfessionalsModule, // para buscar chave PIX do profissional ao criar pagamento
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
