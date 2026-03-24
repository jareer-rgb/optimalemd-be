import { Module } from '@nestjs/common';
import { AdminController, AdminDashboardController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminManagementController } from './admin-management.controller';
import { AdminManagementService } from './admin-management.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [PrismaModule, MailerModule],
  controllers: [AdminController, AdminDashboardController, AdminManagementController],
  providers: [AdminService, AdminManagementService],
  exports: [AdminService]
})
export class AdminModule {}
