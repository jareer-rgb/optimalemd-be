import { Module } from '@nestjs/common';
import { MedicalFormController } from './medical-form.controller';
import { MedicalFormService } from './medical-form.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [PrismaModule, MailerModule],
  controllers: [MedicalFormController],
  providers: [MedicalFormService],
  exports: [MedicalFormService]
})
export class MedicalFormModule {}
