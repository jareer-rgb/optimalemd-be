import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { WorkingHoursController } from './working-hours.controller';
import { WorkingHoursService } from './working-hours.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SchedulesController, WorkingHoursController],
  providers: [SchedulesService, WorkingHoursService],
  exports: [SchedulesService, WorkingHoursService],
})
export class SchedulesModule {}
