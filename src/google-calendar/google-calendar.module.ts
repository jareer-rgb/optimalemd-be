import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarController } from './google-calendar.controller';

@Module({
  imports: [ConfigModule],
  providers: [GoogleCalendarService],
  controllers: [GoogleCalendarController],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
