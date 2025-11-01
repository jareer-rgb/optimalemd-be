import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrescriptionsService } from './prescriptions.service';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get('appointment/:appointmentId')
  async getAppointmentPrescriptions(@Param('appointmentId') appointmentId: string) {
    try {
      const prescriptions = await this.prescriptionsService.getAppointmentPrescriptions(
        appointmentId,
      );
      return {
        success: true,
        statusCode: 200,
        message: 'Prescriptions retrieved successfully',
        data: prescriptions,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to retrieve prescriptions',
        error: error.message,
      };
    }
  }

  @Get('appointment/:appointmentId/medication/:medicationName')
  async getPrescription(
    @Param('appointmentId') appointmentId: string,
    @Param('medicationName') medicationName: string,
  ) {
    try {
      const prescription = await this.prescriptionsService.getPrescription(
        appointmentId,
        decodeURIComponent(medicationName),
      );
      return {
        success: true,
        statusCode: 200,
        message: 'Prescription retrieved successfully',
        data: prescription,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to retrieve prescription',
        error: error.message,
      };
    }
  }

  @Post('appointment/:appointmentId')
  async upsertPrescription(
    @Param('appointmentId') appointmentId: string,
    @Body() body: { medicationName: string; prescription: string },
  ) {
    try {
      const prescription = await this.prescriptionsService.upsertPrescription(
        appointmentId,
        body.medicationName,
        body.prescription,
      );
      return {
        success: true,
        statusCode: 200,
        message: 'Prescription saved successfully',
        data: prescription,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to save prescription',
        error: error.message,
      };
    }
  }

  @Post('appointment/:appointmentId/bulk')
  async bulkUpsertPrescriptions(
    @Param('appointmentId') appointmentId: string,
    @Body() body: { prescriptions: Array<{ medicationName: string; prescription: string }> },
  ) {
    try {
      const prescriptions = await this.prescriptionsService.bulkUpsertPrescriptions(
        appointmentId,
        body.prescriptions,
      );
      return {
        success: true,
        statusCode: 200,
        message: 'Prescriptions saved successfully',
        data: prescriptions,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to save prescriptions',
        error: error.message,
      };
    }
  }

  @Delete('appointment/:appointmentId/medication/:medicationName')
  async deletePrescription(
    @Param('appointmentId') appointmentId: string,
    @Param('medicationName') medicationName: string,
  ) {
    try {
      await this.prescriptionsService.deletePrescription(
        appointmentId,
        decodeURIComponent(medicationName),
      );
      return {
        success: true,
        statusCode: 200,
        message: 'Prescription deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to delete prescription',
        error: error.message,
      };
    }
  }
}

