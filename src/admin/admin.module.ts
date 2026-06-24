import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController, AdminDashboardController, AdminPaymentsController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminManagementController } from './admin-management.controller';
import { AdminManagementService } from './admin-management.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [PrismaModule, MailerModule, ConfigModule],
  controllers: [AdminController, AdminDashboardController, AdminManagementController, AdminPaymentsController],
  providers: [AdminService, AdminManagementService],
  exports: [AdminService]
})
export class AdminModule {}
