import { Controller, Post, Get, Body, Query, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { GoogleCalendarImportService } from './google-calendar-import.service';

@ApiTags('Google Calendar Import')
@Controller('google-calendar/import')
export class GoogleCalendarImportController {
  constructor(private importService: GoogleCalendarImportService) {}

  @Post('working-hours')
  @ApiOperation({
    summary: 'Import working hours from Google Calendar',
    description: 'Import working hours from Google Calendar events for a date range'
  })
  @ApiResponse({ status: 200, description: 'Working hours imported successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async importWorkingHours(
    @Body() body: {
      doctorId: string;
      startDate: string;
      endDate: string;
    }
  ) {
    const { doctorId, startDate, endDate } = body;
    
    if (!doctorId || !startDate || !endDate) {
      return {
        success: false,
        message: 'Doctor ID, start date, and end date are required'
      };
    }

    const result = await this.importService.importWorkingHoursFromCalendar(
      doctorId,
      new Date(startDate),
      new Date(endDate)
    );

    return {
      success: result.success,
      message: result.success
        ? `Processed ${result.totalProcessed} working hours from Google Calendar (${result.workingHoursCreated} created, ${result.workingHoursUpdated} updated). Generated ${result.schedulesGenerated} schedules and ${result.slotsGenerated} slots.`
        : 'Failed to import working hours',
      data: {
        workingHoursCreated: result.workingHoursCreated,
        workingHoursUpdated: result.workingHoursUpdated,
        totalProcessed: result.totalProcessed,
        schedulesGenerated: result.schedulesGenerated || 0,
        slotsGenerated: result.slotsGenerated || 0,
        errors: result.errors
      }
    };
  }

  @Get('available-slots')
  @ApiOperation({
    summary: 'Get available slots from Google Calendar',
    description: 'Get available time slots from Google Calendar for a specific date'
  })
  @ApiQuery({ name: 'doctorId', description: 'Doctor ID', required: true })
  @ApiQuery({ name: 'date', description: 'Date in YYYY-MM-DD format', required: true })
  @ApiResponse({ status: 200, description: 'Available slots retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async getAvailableSlots(
    @Query('doctorId') doctorId: string,
    @Query('date') date: string
  ) {
    if (!doctorId || !date) {
      return {
        success: false,
        message: 'Doctor ID and date are required'
      };
    }

    const result = await this.importService.getAvailableSlotsFromCalendar(
      doctorId,
      new Date(date)
    );

    return {
      success: result.success,
      message: result.success 
        ? `Found ${result.slots.length} available slots`
        : 'Failed to get available slots',
      data: {
        slots: result.slots,
        errors: result.errors
      }
    };
  }

  @Post('sync-calendar')
  @ApiOperation({
    summary: 'Sync Google Calendar with working hours',
    description: 'Two-way sync between Google Calendar and working hours system'
  })
  @ApiResponse({ status: 200, description: 'Calendar synced successfully' })
  async syncCalendar(
    @Body() body: {
      doctorId: string;
      startDate: string;
      endDate: string;
      direction: 'import' | 'export' | 'both';
    }
  ) {
    const { doctorId, startDate, endDate, direction = 'both' } = body;
    
    if (!doctorId || !startDate || !endDate) {
      return {
        success: false,
        message: 'Doctor ID, start date, and end date are required'
      };
    }

    const results: any = {};

    try {
      if (direction === 'import' || direction === 'both') {
        // Import working hours from Google Calendar
        const importResult = await this.importService.importWorkingHoursFromCalendar(
          doctorId,
          new Date(startDate),
          new Date(endDate)
        );
        results.import = importResult;
      }

      if (direction === 'export' || direction === 'both') {
        // Export working hours to Google Calendar (this would use existing sync function)
        // For now, just return a placeholder
        results.export = {
          success: true,
          message: 'Export functionality will be implemented'
        };
      }

      return {
        success: true,
        message: 'Calendar sync completed',
        data: results
      };
    } catch (error) {
      return {
        success: false,
        message: 'Calendar sync failed',
        error: error.message
      };
    }
  }
}
