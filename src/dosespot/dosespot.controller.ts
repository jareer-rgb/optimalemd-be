import { Controller, Post, Get, Body, Param, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DoseSpotService } from './dosespot.service';
import { SyncPatientToDoseSpotDto, DoseSpotSearchPatientDto } from './dto/dosespot-patient.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BaseApiResponse } from '../common/dto/api-response.dto';

@ApiTags('DoseSpot Integration')
@Controller('dosespot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DoseSpotController {
  constructor(private readonly doseSpotService: DoseSpotService) {}

  @Post('patients/sync/:patientId')
  @ApiOperation({
    summary: 'Sync patient to DoseSpot',
    description: 'Searches for existing patient in DoseSpot or creates new one, then stores the DoseSpot patient ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient synced successfully',
    type: BaseApiResponse,
  })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async syncPatientToDoseSpot(
    @Param('patientId') patientId: string,
    @Body() body: { forceUpdate?: boolean },
    @Request() req: any,
  ) {
    // Only allow doctors/admins to sync patients, or patients to sync themselves
    const userType = req.user.userType;
    const userId = req.user.id;

    if (userType !== 'doctor' && userType !== 'admin' && userId !== patientId) {
      throw new UnauthorizedException('Unauthorized to sync this patient');
    }

    const result = await this.doseSpotService.syncPatientToDoseSpot(
      patientId,
      body.forceUpdate || false,
    );

    return {
      success: true,
      statusCode: 200,
      message: result.message,
      data: result,
      timestamp: new Date().toISOString(),
      path: `/api/dosespot/patients/sync/${patientId}`,
    };
  }

  @Post('patients/search')
  @ApiOperation({
    summary: 'Search for patient in DoseSpot',
    description: 'Searches for existing patient in DoseSpot by name and date of birth',
  })
  @ApiResponse({
    status: 200,
    description: 'Search completed successfully',
    type: BaseApiResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async searchPatient(
    @Body() searchDto: DoseSpotSearchPatientDto,
    @Request() req: any,
  ) {
    // Only allow doctors/admins to search
    const userType = req.user.userType;
    if (userType !== 'doctor' && userType !== 'admin') {
      throw new UnauthorizedException('Unauthorized to search patients');
    }

    const result = await this.doseSpotService.searchPatient(searchDto);

    return {
      success: true,
      statusCode: 200,
      message: 'Patient search completed',
      data: result,
      timestamp: new Date().toISOString(),
      path: '/api/dosespot/patients/search',
    };
  }

  @Get('patients/:patientId/dosespot-id')
  @ApiOperation({
    summary: 'Get DoseSpot patient ID for a patient',
    description: 'Returns the DoseSpot patient ID if the patient has been synced',
  })
  @ApiResponse({
    status: 200,
    description: 'DoseSpot patient ID retrieved',
    type: BaseApiResponse,
  })
  @ApiResponse({ status: 404, description: 'Patient not found or not synced' })
  async getDoseSpotPatientId(
    @Param('patientId') patientId: string,
    @Request() req: any,
  ) {
    // Only allow doctors/admins or the patient themselves
    const userType = req.user.userType;
    const userId = req.user.id;

    if (userType !== 'doctor' && userType !== 'admin' && userId !== patientId) {
      throw new UnauthorizedException('Unauthorized');
    }

    const result = await this.doseSpotService.getDoseSpotPatientId(patientId);

    if (!result) {
      return {
        success: false,
        statusCode: 404,
        message: 'Patient not synced to DoseSpot',
        data: null,
        timestamp: new Date().toISOString(),
        path: `/api/dosespot/patients/${patientId}/dosespot-id`,
      };
    }

    return {
      success: true,
      statusCode: 200,
      message: 'DoseSpot patient ID retrieved',
      data: result,
      timestamp: new Date().toISOString(),
      path: `/api/dosespot/patients/${patientId}/dosespot-id`,
    };
  }

  @Get('jumpstart-url/:appointmentId')
  @ApiOperation({
    summary: 'Generate DoseSpot Jumpstart SSO URL for prescribing',
    description: 'Generates a Single Sign-On URL to open DoseSpot prescribing interface in an iframe',
  })
  @ApiResponse({
    status: 200,
    description: 'Jumpstart URL generated successfully',
    type: BaseApiResponse,
  })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @ApiResponse({ status: 400, description: 'Bad request - patient not synced or not paid' })
  async generateJumpstartUrl(
    @Param('appointmentId') appointmentId: string,
    @Request() req: any,
  ) {
    // Only allow doctors to generate Jumpstart URLs
    const userType = req.user.userType;
    if (userType !== 'doctor' && userType !== 'admin') {
      throw new UnauthorizedException('Only doctors can generate DoseSpot Jumpstart URLs');
    }

    const doctorId = req.user.id;
    const result = await this.doseSpotService.generateJumpstartUrl(appointmentId, doctorId);
    
    return {
      success: true,
      statusCode: 200,
      message: 'DoseSpot Jumpstart URL generated successfully',
      data: result,
      timestamp: new Date().toISOString(),
      path: `/api/dosespot/jumpstart-url/${appointmentId}`,
    };
  }
}

