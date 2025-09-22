import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { IntakeService } from './intake.service';
import { CreateIntakeFormDto } from './dto/create-intake-form.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BaseApiResponse } from '../common/dto/api-response.dto';

@ApiTags('Intake')
@Controller('intake')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check intake completion status for current user' })
  @ApiResponse({ status: 200, description: 'Intake status retrieved successfully' })
  async getIntakeStatus(@Request() req): Promise<BaseApiResponse<any>> {
    const patientId = req.user.id;
    const status = await this.intakeService.checkIntakeCompletionStatus(patientId);
    
    return {
      success: true,
      statusCode: 200,
      message: 'Intake status retrieved successfully',
      data: status,
      timestamp: new Date().toISOString(),
      path: '/api/intake/status',
    };
  }

  @Put('screen2')
  @ApiOperation({ summary: 'Complete Screen 2 - About You' })
  @ApiResponse({ status: 200, description: 'Screen 2 completed successfully' })
  async completeScreen2(
    @Request() req,
    @Body() screen2Data: {
      height?: string;
      weight?: string;
      waist?: string;
    },
  ): Promise<BaseApiResponse<any>> {
    const patientId = req.user.id;
    await this.intakeService.completeScreen2(patientId, screen2Data);
    
    return {
      success: true,
      statusCode: 200,
      message: 'Screen 2 completed successfully',
      data: null,
      timestamp: new Date().toISOString(),
      path: '/api/intake/screen2',
    };
  }

  @Post('form/:appointmentId')
  @ApiOperation({ summary: 'Create intake form for appointment' })
  @ApiParam({ name: 'appointmentId', description: 'Appointment ID' })
  @ApiResponse({ status: 201, description: 'Intake form created successfully' })
  async createIntakeForm(
    @Request() req,
    @Param('appointmentId') appointmentId: string,
    @Body() intakeData: CreateIntakeFormDto,
  ): Promise<BaseApiResponse<any>> {
    const patientId = req.user.id;
    const form = await this.intakeService.createIntakeForm(patientId, appointmentId, intakeData);
    
    return {
      success: true,
      statusCode: 201,
      message: 'Intake form created successfully',
      data: form,
      timestamp: new Date().toISOString(),
      path: `/api/intake/form/${appointmentId}`,
    };
  }

  @Post('copy/:appointmentId')
  @ApiOperation({ summary: 'Copy previous medical form to new appointment' })
  @ApiParam({ name: 'appointmentId', description: 'Appointment ID' })
  @ApiResponse({ status: 201, description: 'Medical form copied successfully' })
  async copyPreviousForm(
    @Request() req,
    @Param('appointmentId') appointmentId: string,
  ): Promise<BaseApiResponse<any>> {
    const patientId = req.user.id;
    const form = await this.intakeService.copyPreviousMedicalForm(patientId, appointmentId);
    
    return {
      success: true,
      statusCode: 201,
      message: 'Medical form copied successfully',
      data: form,
      timestamp: new Date().toISOString(),
      path: `/api/intake/copy/${appointmentId}`,
    };
  }

  @Get('form/:appointmentId')
  @ApiOperation({ summary: 'Get intake form for appointment' })
  @ApiParam({ name: 'appointmentId', description: 'Appointment ID' })
  @ApiResponse({ status: 200, description: 'Intake form retrieved successfully' })
  async getIntakeForm(
    @Param('appointmentId') appointmentId: string,
  ): Promise<BaseApiResponse<any>> {
    const form = await this.intakeService.getIntakeFormForAppointment(appointmentId);
    
    return {
      success: true,
      statusCode: 200,
      message: 'Intake form retrieved successfully',
      data: form,
      timestamp: new Date().toISOString(),
      path: `/api/intake/form/${appointmentId}`,
    };
  }
}
