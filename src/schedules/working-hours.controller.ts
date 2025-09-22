import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkingHoursService } from './working-hours.service';
import {
  CreateWorkingHoursDto,
  CreateMultipleWorkingHoursDto,
  UpdateWorkingHoursDto,
  QueryWorkingHoursDto,
  WorkingHoursResponseDto,
  WorkingHoursWithDoctorDto,
  GenerateScheduleFromWorkingHoursDto,
} from './dto';
import { PaginatedApiResponse, SuccessApiResponseWithData } from '../common/dto/api-response.dto';

@ApiTags('Working Hours')
@Controller('working-hours')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WorkingHoursController {
  constructor(private readonly workingHoursService: WorkingHoursService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create working hours for a specific day',
    description: 'Create working hours for a doctor on a specific day of the week'
  })
  @ApiBody({ type: CreateWorkingHoursDto })
  @ApiResponse({
    status: 201,
    description: 'Working hours created successfully',
    type: SuccessApiResponseWithData<WorkingHoursResponseDto>
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or doctor not available'
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found'
  })
  @ApiResponse({
    status: 409,
    description: 'Working hours already exist for this day'
  })
  async createWorkingHours(
    @Body() createWorkingHoursDto: CreateWorkingHoursDto
  ): Promise<SuccessApiResponseWithData<WorkingHoursResponseDto>> {
    const workingHours = await this.workingHoursService.createWorkingHours(createWorkingHoursDto);
    return {
      success: true,
      message: 'Working hours created successfully',
      data: workingHours
    };
  }

  @Post('multiple')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create working hours for multiple days',
    description: 'Create working hours for a doctor across multiple days of the week'
  })
  @ApiBody({ type: CreateMultipleWorkingHoursDto })
  @ApiResponse({
    status: 201,
    description: 'Working hours created successfully',
    type: SuccessApiResponseWithData<WorkingHoursResponseDto[]>
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or doctor not available'
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found'
  })
  @ApiResponse({
    status: 409,
    description: 'Working hours already exist for some days'
  })
  async createMultipleWorkingHours(
    @Body() createMultipleWorkingHoursDto: CreateMultipleWorkingHoursDto
  ): Promise<SuccessApiResponseWithData<WorkingHoursResponseDto[]>> {
    const workingHours = await this.workingHoursService.createMultipleWorkingHours(createMultipleWorkingHoursDto);
    return {
      success: true,
      message: `${workingHours.length} working hours created successfully`,
      data: workingHours
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all working hours',
    description: 'Retrieve working hours with filtering and pagination'
  })
  @ApiQuery({ name: 'doctorId', required: false, description: 'Filter by doctor ID' })
  @ApiQuery({ name: 'dayOfWeek', required: false, description: 'Filter by day of week (0-6)' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Working hours retrieved successfully',
    type: PaginatedApiResponse<WorkingHoursResponseDto>
  })
  async findAll(
    @Query() query: QueryWorkingHoursDto
  ): Promise<PaginatedApiResponse<WorkingHoursResponseDto>> {
    const { workingHours, total } = await this.workingHoursService.findAll(query);
    const page = query.page || 1;
    const limit = query.limit || 10;
    
    return {
      success: true,
      statusCode: 200,
      message: 'Working hours retrieved successfully',
      data: workingHours,
      timestamp: new Date().toISOString(),
      path: '/working-hours',
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get working hours by ID',
    description: 'Retrieve specific working hours by its ID'
  })
  @ApiParam({ name: 'id', description: 'Working hours ID' })
  @ApiResponse({
    status: 200,
    description: 'Working hours retrieved successfully',
    type: SuccessApiResponseWithData<WorkingHoursResponseDto>
  })
  @ApiResponse({
    status: 404,
    description: 'Working hours not found'
  })
  async findById(
    @Param('id') id: string
  ): Promise<SuccessApiResponseWithData<WorkingHoursResponseDto>> {
    const workingHours = await this.workingHoursService.findById(id);
    return {
      success: true,
      message: 'Working hours retrieved successfully',
      data: workingHours
    };
  }

  @Get(':id/doctor-info')
  @ApiOperation({
    summary: 'Get working hours with doctor info',
    description: 'Retrieve working hours including doctor information'
  })
  @ApiParam({ name: 'id', description: 'Working hours ID' })
  @ApiResponse({
    status: 200,
    description: 'Working hours with doctor info retrieved successfully',
    type: SuccessApiResponseWithData<WorkingHoursWithDoctorDto>
  })
  @ApiResponse({
    status: 404,
    description: 'Working hours not found'
  })
  async findByIdWithDoctorInfo(
    @Param('id') id: string
  ): Promise<SuccessApiResponseWithData<WorkingHoursWithDoctorDto>> {
    const workingHours = await this.workingHoursService.findByIdWithDoctorInfo(id);
    return {
      success: true,
      message: 'Working hours with doctor info retrieved successfully',
      data: workingHours
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update working hours',
    description: 'Update existing working hours'
  })
  @ApiParam({ name: 'id', description: 'Working hours ID' })
  @ApiBody({ type: UpdateWorkingHoursDto })
  @ApiResponse({
    status: 200,
    description: 'Working hours updated successfully',
    type: SuccessApiResponseWithData<WorkingHoursResponseDto>
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error'
  })
  @ApiResponse({
    status: 404,
    description: 'Working hours not found'
  })
  async updateWorkingHours(
    @Param('id') id: string,
    @Body() updateWorkingHoursDto: UpdateWorkingHoursDto
  ): Promise<SuccessApiResponseWithData<WorkingHoursResponseDto>> {
    const workingHours = await this.workingHoursService.updateWorkingHours(id, updateWorkingHoursDto);
    return {
      success: true,
      message: 'Working hours updated successfully',
      data: workingHours
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete working hours',
    description: 'Delete working hours and all generated schedules (if no appointments exist)'
  })
  @ApiParam({ name: 'id', description: 'Working hours ID' })
  @ApiResponse({
    status: 204,
    description: 'Working hours deleted successfully'
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete working hours with existing appointments'
  })
  @ApiResponse({
    status: 404,
    description: 'Working hours not found'
  })
  async deleteWorkingHours(@Param('id') id: string): Promise<void> {
    await this.workingHoursService.deleteWorkingHours(id);
  }

  @Post('generate-schedules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate schedules from working hours',
    description: 'Generate appointment schedules for a date range based on working hours'
  })
  @ApiBody({ type: GenerateScheduleFromWorkingHoursDto })
  @ApiResponse({
    status: 201,
    description: 'Schedules generated successfully',
    type: SuccessApiResponseWithData<any>
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or no working hours found'
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found'
  })
  async generateSchedulesFromWorkingHours(
    @Body() generateDto: GenerateScheduleFromWorkingHoursDto
  ): Promise<SuccessApiResponseWithData<any>> {
    const result = await this.workingHoursService.generateSchedulesFromWorkingHours(generateDto);
    return {
      success: true,
      message: `Generated ${result.totalGenerated} schedules successfully`,
      data: result
    };
  }
}
