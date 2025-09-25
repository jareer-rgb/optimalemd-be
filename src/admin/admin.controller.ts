import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { 
  AdminCreatePatientDto, 
  AdminUpdatePatientDto, 
  AdminCreateMedicalFormDto, 
  PatientWithMedicalFormResponseDto 
} from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Admin - Patient Management')
@Controller('admin/patients')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create Patient (Admin)', 
    description: 'Create a new patient with auto-generated password and optional welcome email' 
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Patient created successfully', 
    type: PatientWithMedicalFormResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Patient with email already exists' })
  async createPatient(
    @Body() createPatientDto: AdminCreatePatientDto
  ): Promise<{ success: boolean; message: string; data: PatientWithMedicalFormResponseDto }> {
    const patient = await this.adminService.createPatient(createPatientDto);
    
    return {
      success: true,
      message: 'Patient created successfully',
      data: patient
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get All Patients (Admin)', 
    description: 'Retrieve all patients with pagination, search, and filtering' 
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 50 })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, email, or phone' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', enum: ['active', 'inactive', 'all'] })
  @ApiResponse({ 
    status: 200, 
    description: 'Patients retrieved successfully'
  })
  async getAllPatients(
    @Query() query: any
  ): Promise<{ 
    success: boolean; 
    message: string; 
    data: PatientWithMedicalFormResponseDto[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  }> {
    const result = await this.adminService.getAllPatients(query);
    
    return {
      success: true,
      message: 'Patients retrieved successfully',
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit)
      }
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get Patient by ID (Admin)', 
    description: 'Retrieve a specific patient with medical form data' 
  })
  @ApiParam({ name: 'id', description: 'Patient ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Patient retrieved successfully', 
    type: PatientWithMedicalFormResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async getPatientById(
    @Param('id') patientId: string
  ): Promise<{ success: boolean; message: string; data: PatientWithMedicalFormResponseDto }> {
    const patient = await this.adminService.getPatientWithMedicalForm(patientId);
    
    return {
      success: true,
      message: 'Patient retrieved successfully',
      data: patient
    };
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Update Patient (Admin)', 
    description: 'Update patient data (excluding medical form data)' 
  })
  @ApiParam({ name: 'id', description: 'Patient ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Patient updated successfully', 
    type: PatientWithMedicalFormResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async updatePatient(
    @Param('id') patientId: string,
    @Body() updatePatientDto: AdminUpdatePatientDto
  ): Promise<{ success: boolean; message: string; data: PatientWithMedicalFormResponseDto }> {
    const patient = await this.adminService.updatePatient(patientId, updatePatientDto);
    
    return {
      success: true,
      message: 'Patient updated successfully',
      data: patient
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Delete Patient (Admin)', 
    description: 'Soft delete patient by deactivating account' 
  })
  @ApiParam({ name: 'id', description: 'Patient ID' })
  @ApiResponse({ status: 204, description: 'Patient deleted successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async deletePatient(
    @Param('id') patientId: string
  ): Promise<void> {
    await this.adminService.deletePatient(patientId);
  }

  @Post(':id/medical-form')
  @ApiOperation({ 
    summary: 'Create Medical Form (Admin)', 
    description: 'Create medical form for a patient' 
  })
  @ApiParam({ name: 'id', description: 'Patient ID' })
  @ApiResponse({ status: 201, description: 'Medical form created successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  @ApiResponse({ status: 409, description: 'Medical form already exists' })
  async createMedicalForm(
    @Param('id') patientId: string,
    @Body() createMedicalFormDto: AdminCreateMedicalFormDto
  ): Promise<{ success: boolean; message: string; data: any }> {
    const medicalForm = await this.adminService.createMedicalForm(patientId, createMedicalFormDto);
    
    return {
      success: true,
      message: 'Medical form created successfully',
      data: medicalForm
    };
  }

  @Put(':id/medical-form')
  @ApiOperation({ 
    summary: 'Update Medical Form (Admin)', 
    description: 'Update medical form for a patient' 
  })
  @ApiParam({ name: 'id', description: 'Patient ID' })
  @ApiResponse({ status: 200, description: 'Medical form updated successfully' })
  @ApiResponse({ status: 404, description: 'Patient or medical form not found' })
  async updateMedicalForm(
    @Param('id') patientId: string,
    @Body() updateMedicalFormDto: Partial<AdminCreateMedicalFormDto>
  ): Promise<{ success: boolean; message: string; data: any }> {
    const medicalForm = await this.adminService.updateMedicalForm(patientId, updateMedicalFormDto);
    
    return {
      success: true,
      message: 'Medical form updated successfully',
      data: medicalForm
    };
  }
}
