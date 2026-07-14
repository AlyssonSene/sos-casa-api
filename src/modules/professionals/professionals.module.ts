import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessionalProfile } from './entities/professional-profile.entity';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsController } from './professionals.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProfessionalProfile])],
  providers: [ProfessionalsService],
  controllers: [ProfessionalsController],
  exports: [ProfessionalsService],
})
export class ProfessionalsModule {}
