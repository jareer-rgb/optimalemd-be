import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { StripeController, StripeWebhookController } from './stripe.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { MailerModule } from '../mailer/mailer.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';

@Module({
  imports: [ConfigModule, PrismaModule, AppointmentsModule, MailerModule, GoogleCalendarModule],
  providers: [StripeService],
  controllers: [StripeController, StripeWebhookController],
  exports: [StripeService],
})
export class StripeModule {}
