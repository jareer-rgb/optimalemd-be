import { Module } from '@nestjs/common';
import { FollowUpIntakeController } from './follow-up-intake.controller';
import { FollowUpIntakeService } from './follow-up-intake.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FollowUpIntakeController],
  providers: [FollowUpIntakeService],
  exports: [FollowUpIntakeService],
})
export class FollowUpIntakeModule {}
