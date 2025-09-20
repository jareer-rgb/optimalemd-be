import { Module } from '@nestjs/common';
import { IntakeController } from './intake.controller';
import { IntakeService } from './intake.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MedicalFormModule } from '../medical-form/medical-form.module';

@Module({
  imports: [PrismaModule, MedicalFormModule],
  controllers: [IntakeController],
  providers: [IntakeService],
  exports: [IntakeService],
})
export class IntakeModule {}
