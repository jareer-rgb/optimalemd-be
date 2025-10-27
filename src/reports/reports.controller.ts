import { Controller, Post, Get, Param, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Response } from 'express';
import * as fs from 'fs';

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
  async download(
    @Param('appointmentId') appointmentId: string,
    @Res() res: Response
  ) {
    try {
      console.log('Downloading report for appointment:', appointmentId);
      
      const fileInfo = await this.reportsService.getReportInfo(appointmentId);
      const filePath = await this.reportsService.getReportPath(appointmentId);
      
      console.log('Report file path:', filePath);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('Report file not found at path:', filePath);
        return res.status(404).json({
          success: false,
          message: 'Report file not found',
        });
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      console.log('File size:', stats.size, 'bytes');

      // Set headers and stream file
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
      res.setHeader('Content-Length', stats.size.toString());
      
      const fileStream = fs.createReadStream(filePath);
      
      fileStream.on('error', (error) => {
        console.error('Error reading file stream:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error streaming file',
          });
        }
      });
      
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading report:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error downloading report',
          error: error.message,
        });
      }
    }
  }

  @Get('view/:appointmentId')
  async view(
    @Param('appointmentId') appointmentId: string,
    @Res() res: Response
  ) {
    try {
      console.log('Viewing report for appointment:', appointmentId);
      
      const fileInfo = await this.reportsService.getReportInfo(appointmentId);
      const filePath = await this.reportsService.getReportPath(appointmentId);
      
      console.log('Report file path:', filePath);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('Report file not found at path:', filePath);
        return res.status(404).json({
          success: false,
          message: 'Report file not found',
        });
      }

      // Get file stats to verify it's valid
      const stats = fs.statSync(filePath);
      console.log('File size:', stats.size, 'bytes');

      // Set headers and stream file
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${fileInfo.fileName}"`);
      res.setHeader('Content-Length', stats.size.toString());
      res.setHeader('Cache-Control', 'no-cache');
      
      const fileStream = fs.createReadStream(filePath);
      
      fileStream.on('error', (error) => {
        console.error('Error reading file stream:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error streaming file',
          });
        }
      });
      
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error viewing report:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error viewing report',
          error: error.message,
        });
      }
    }
  }
}


