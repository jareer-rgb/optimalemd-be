import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { FollowUpIntakeService } from './follow-up-intake.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BaseApiResponse } from '../common/dto/api-response.dto';

@ApiTags('Follow-Up Intake')
@Controller('follow-up-intake')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FollowUpIntakeController {
  constructor(private readonly service: FollowUpIntakeService) {}

  /**
   * Returns whether the current patient is a follow-up patient and their last appointment's medications.
   */
  @Get('patient-context')
  @ApiOperation({ summary: 'Get follow-up context for current patient (or a specific patient for admin)' })
  async getPatientContext(
    @Request() req,
    @Query('patientId') queryPatientId?: string,
  ): Promise<BaseApiResponse<any>> {
    const patientId = queryPatientId || req.user.id || req.user.sub;
    const data = await this.service.getPatientContext(patientId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Patient context retrieved',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/follow-up-intake/patient-context',
    };
  }

  /**
   * Submit the follow-up intake form linked to an appointment.
   */
  @Post(':appointmentId')
  @ApiOperation({ summary: 'Submit follow-up intake form' })
  @ApiParam({ name: 'appointmentId', description: 'Appointment ID' })
  async submitForm(
    @Request() req,
    @Param('appointmentId') appointmentId: string,
    @Body() body: { formData: any; patientId?: string },
  ): Promise<BaseApiResponse<any>> {
    // Allow admin to pass patientId explicitly (e.g. when submitting on behalf of a patient)
    const patientId = body.patientId || req.user.id || req.user.sub;
    const form = await this.service.submitForm(patientId, appointmentId, body.formData);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Follow-up intake form submitted successfully',
      data: form,
      timestamp: new Date().toISOString(),
      path: `/api/follow-up-intake/${appointmentId}`,
    };
  }

  /**
   * Save doctor-edited narrative summary.
   */
  @Patch('appointment/:appointmentId/summary')
  @ApiOperation({ summary: 'Save edited narrative summary for follow-up intake form' })
  @ApiParam({ name: 'appointmentId', description: 'Appointment ID' })
  async saveNarrativeSummary(
    @Param('appointmentId') appointmentId: string,
    @Body() body: { narrativeSummary: string },
  ): Promise<BaseApiResponse<any>> {
    const data = await this.service.saveNarrativeSummary(appointmentId, body.narrativeSummary);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Narrative summary saved',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/follow-up-intake/appointment/${appointmentId}/summary`,
    };
  }

  /**
   * Get the follow-up intake form for an appointment (doctor/admin).
   */
  @Get('appointment/:appointmentId')
  @ApiOperation({ summary: 'Get follow-up intake form for appointment' })
  @ApiParam({ name: 'appointmentId', description: 'Appointment ID' })
  async getForm(
    @Param('appointmentId') appointmentId: string,
  ): Promise<BaseApiResponse<any>> {
    const data = await this.service.getFormByAppointment(appointmentId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Follow-up intake form retrieved',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/follow-up-intake/appointment/${appointmentId}`,
    };
  }
}
