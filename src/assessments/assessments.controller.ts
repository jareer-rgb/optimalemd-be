import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  AssessmentResponseDto,
  CreateAppointmentAssessmentDto,
  UpdateAppointmentAssessmentDto,
  AppointmentAssessmentResponseDto,
} from './dto/assessment.dto';

@ApiTags('assessments')
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  // Assessment CRUD endpoints
  @Post()
  @ApiOperation({ summary: 'Create a new assessment' })
  @ApiResponse({ status: 201, description: 'Assessment created successfully', type: AssessmentResponseDto })
  async create(@Body() createAssessmentDto: CreateAssessmentDto): Promise<AssessmentResponseDto> {
    return this.assessmentsService.createAssessment(createAssessmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assessments' })
  @ApiResponse({ status: 200, description: 'List of assessments', type: [AssessmentResponseDto] })
  async findAll(): Promise<AssessmentResponseDto[]> {
    return this.assessmentsService.findAllAssessments();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assessment by ID' })
  @ApiResponse({ status: 200, description: 'Assessment found', type: AssessmentResponseDto })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async findOne(@Param('id') id: string): Promise<AssessmentResponseDto> {
    return this.assessmentsService.findOneAssessment(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update assessment' })
  @ApiResponse({ status: 200, description: 'Assessment updated successfully', type: AssessmentResponseDto })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async update(
    @Param('id') id: string,
    @Body() updateAssessmentDto: UpdateAssessmentDto,
  ): Promise<AssessmentResponseDto> {
    return this.assessmentsService.updateAssessment(id, updateAssessmentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete assessment' })
  @ApiResponse({ status: 204, description: 'Assessment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.assessmentsService.removeAssessment(id);
  }

  // Appointment Assessment endpoints
  @Post('appointment')
  @ApiOperation({ summary: 'Create or update appointment assessment' })
  @ApiResponse({ status: 201, description: 'Appointment assessment created/updated successfully', type: AppointmentAssessmentResponseDto })
  async createAppointmentAssessment(
    @Body() createDto: CreateAppointmentAssessmentDto,
  ): Promise<AppointmentAssessmentResponseDto> {
    return this.assessmentsService.createAppointmentAssessment(createDto);
  }

  @Get('appointment/:appointmentId')
  @ApiOperation({ summary: 'Get all assessments for an appointment' })
  @ApiResponse({ status: 200, description: 'List of appointment assessments', type: [AppointmentAssessmentResponseDto] })
  async getAppointmentAssessments(
    @Param('appointmentId') appointmentId: string,
  ): Promise<AppointmentAssessmentResponseDto[]> {
    return this.assessmentsService.getAppointmentAssessments(appointmentId);
  }

  @Get('appointment/:appointmentId/data')
  @ApiOperation({ summary: 'Get appointment assessment data as JSON' })
  @ApiResponse({ status: 200, description: 'Appointment assessment data' })
  async getAppointmentAssessmentData(
    @Param('appointmentId') appointmentId: string,
  ): Promise<Record<string, any>> {
    return this.assessmentsService.getAppointmentAssessmentData(appointmentId);
  }

  @Patch('appointment/:appointmentId/:assessmentId')
  @ApiOperation({ summary: 'Update appointment assessment' })
  @ApiResponse({ status: 200, description: 'Appointment assessment updated successfully', type: AppointmentAssessmentResponseDto })
  @ApiResponse({ status: 404, description: 'Appointment assessment not found' })
  async updateAppointmentAssessment(
    @Param('appointmentId') appointmentId: string,
    @Param('assessmentId') assessmentId: string,
    @Body() updateDto: UpdateAppointmentAssessmentDto,
  ): Promise<AppointmentAssessmentResponseDto> {
    return this.assessmentsService.updateAppointmentAssessment(appointmentId, assessmentId, updateDto);
  }

  @Delete('appointment/:appointmentId/:assessmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove assessment from appointment' })
  @ApiResponse({ status: 204, description: 'Appointment assessment removed successfully' })
  @ApiResponse({ status: 404, description: 'Appointment assessment not found' })
  async removeAppointmentAssessment(
    @Param('appointmentId') appointmentId: string,
    @Param('assessmentId') assessmentId: string,
  ): Promise<void> {
    return this.assessmentsService.removeAppointmentAssessment(appointmentId, assessmentId);
  }
}