import { Module } from '@nestjs/common';
import { DoseSpotService } from './dosespot.service';
import { DoseSpotController } from './dosespot.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DoseSpotController],
  providers: [DoseSpotService],
  exports: [DoseSpotService],
})
export class DoseSpotModule {}

