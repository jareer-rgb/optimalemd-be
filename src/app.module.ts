import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CommonModule } from './common/common.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { DoctorsModule } from './doctors/doctors.module';
import { ServicesModule } from './services/services.module';
import { SchedulesModule } from './schedules/schedules.module';
import { StripeModule } from './stripe/stripe.module';
import { MessagesModule } from './messages/messages.module';
import { MedicalFormModule } from './medical-form/medical-form.module';
import { IntakeModule } from './intake/intake.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { ContactModule } from './contact/contact.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';

@Module({ 
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommonModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    AppointmentsModule,
    DoctorsModule,
    ServicesModule,
    SchedulesModule,
    StripeModule,
    MessagesModule,
    MedicalFormModule,
    IntakeModule,
    AdminModule,
    ReportsModule,
    AssessmentsModule,
    ContactModule,
    PrescriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
