import { Controller, Post, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate/:appointmentId')
  @HttpCode(HttpStatus.CREATED)
  async generate(@Param('appointmentId') appointmentId: string) {
    const result = await this.reportsService.generateReport(appointmentId);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Report generated successfully',
      data: result,
    };
  }

  @Get('download/:appointmentId')
  async download(@Param('appointmentId') appointmentId: string) {
    const fileInfo = await this.reportsService.getReportInfo(appointmentId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Report download link ready',
      data: fileInfo,
    };
  }

  @Get('view/:appointmentId')
  async view(@Param('appointmentId') appointmentId: string) {
    const fileInfo = await this.reportsService.getReportInfo(appointmentId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Report view link ready',
      data: fileInfo,
    };
  }
}


