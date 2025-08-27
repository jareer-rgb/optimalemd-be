import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { BookingsService } from './bookings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [PrismaModule, MailerModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, BookingsService],
  exports: [AppointmentsService, BookingsService],
})
export class AppointmentsModule {}
