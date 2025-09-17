import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarController } from './google-calendar.controller';
import { GoogleCalendarOAuthService } from './google-calendar-oauth.service';
import { GoogleCalendarOAuthController } from './google-calendar-oauth.controller';
import { GoogleCalendarImportService } from './google-calendar-import.service';
import { GoogleCalendarImportController } from './google-calendar-import.controller';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [GoogleCalendarService, GoogleCalendarOAuthService, GoogleCalendarImportService],
  controllers: [GoogleCalendarController, GoogleCalendarOAuthController, GoogleCalendarImportController],
  exports: [GoogleCalendarService, GoogleCalendarOAuthService, GoogleCalendarImportService],
})
export class GoogleCalendarModule {}
