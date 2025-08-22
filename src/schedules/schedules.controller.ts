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
import { SchedulesService } from './schedules.service';
import {
  CreateScheduleDto,
  CreateMultipleSchedulesDto,
  UpdateScheduleDto,
  QuerySchedulesDto,
  CreateSlotDto,
  CreateMultipleSlotsDto,
  UpdateSlotDto,
  AvailableSlotsQueryDto,
  ScheduleResponseDto,
  ScheduleWithSlotsDto,
  ScheduleWithDoctorInfoDto,
  SlotResponseDto,
  SlotWithScheduleInfoDto,
} from './dto';
import { PaginatedApiResponse, SuccessApiResponseWithData } from '../common/dto/api-response.dto';

@ApiTags('Schedules')
@Controller('schedules')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  // Schedule endpoints

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new schedule',
    description: 'Create a single schedule for a doctor on a specific date and time'
  })
  @ApiBody({ type: CreateScheduleDto })
  @ApiResponse({
    status: 201,
    description: 'Schedule created successfully',
    type: SuccessApiResponseWithData<ScheduleResponseDto>
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
    description: 'Schedule conflicts with existing schedule'
  })
  async createSchedule(
    @Body() createScheduleDto: CreateScheduleDto
  ): Promise<SuccessApiResponseWithData<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.createSchedule(createScheduleDto);
    return {
      success: true,
      message: 'Schedule created successfully',
      data: schedule
    };
  }

  @Post('multiple')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create multiple schedules',
    description: 'Create multiple schedules for a doctor across a date range with working days'
  })
  @ApiBody({ type: CreateMultipleSchedulesDto })
  @ApiResponse({
    status: 201,
    description: 'Schedules created successfully',
    type: SuccessApiResponseWithData<ScheduleResponseDto[]>
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or doctor not available'
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found'
  })
  async createMultipleSchedules(
    @Body() createMultipleSchedulesDto: CreateMultipleSchedulesDto
  ): Promise<SuccessApiResponseWithData<ScheduleResponseDto[]>> {
    const schedules = await this.schedulesService.createMultipleSchedules(createMultipleSchedulesDto);
    return {
      success: true,
      message: `${schedules.length} schedules created successfully`,
      data: schedules
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all schedules',
    description: 'Retrieve schedules with filtering and pagination'
  })
  @ApiQuery({ name: 'doctorId', required: false, description: 'Filter by doctor ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'isAvailable', required: false, description: 'Filter by availability status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Schedules retrieved successfully',
    type: PaginatedApiResponse<ScheduleResponseDto>
  })
  async findAll(
    @Query() query: QuerySchedulesDto
  ): Promise<PaginatedApiResponse<ScheduleResponseDto>> {
    const { schedules, total } = await this.schedulesService.findAll(query);
    const page = query.page || 1;
    const limit = query.limit || 10;
    
    return {
      success: true,
      statusCode: 200,
      message: 'Schedules retrieved successfully',
      data: schedules,
      timestamp: new Date().toISOString(),
      path: '/schedules',
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
    summary: 'Get schedule by ID',
    description: 'Retrieve a specific schedule by its ID'
  })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({
    status: 200,
    description: 'Schedule retrieved successfully',
    type: SuccessApiResponseWithData<ScheduleResponseDto>
  })
  @ApiResponse({
    status: 404,
    description: 'Schedule not found'
  })
  async findById(
    @Param('id') id: string
  ): Promise<SuccessApiResponseWithData<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.findById(id);
    return {
      success: true,
      message: 'Schedule retrieved successfully',
      data: schedule
    };
  }

  @Get(':id/slots')
  @ApiOperation({
    summary: 'Get schedule with slots',
    description: 'Retrieve a schedule including all its time slots'
  })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({
    status: 200,
    description: 'Schedule with slots retrieved successfully',
    type: SuccessApiResponseWithData<ScheduleWithSlotsDto>
  })
  @ApiResponse({
    status: 404,
    description: 'Schedule not found'
  })
  async findByIdWithSlots(
    @Param('id') id: string
  ): Promise<SuccessApiResponseWithData<ScheduleWithSlotsDto>> {
    const schedule = await this.schedulesService.findByIdWithSlots(id);
    return {
      success: true,
      message: 'Schedule with slots retrieved successfully',
      data: schedule
    };
  }

  @Get(':id/doctor-info')
  @ApiOperation({
    summary: 'Get schedule with doctor info',
    description: 'Retrieve a schedule including doctor information'
  })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({
    status: 200,
    description: 'Schedule with doctor info retrieved successfully',
    type: SuccessApiResponseWithData<ScheduleWithDoctorInfoDto>
  })
  @ApiResponse({
    status: 404,
    description: 'Schedule not found'
  })
  async findByIdWithDoctorInfo(
    @Param('id') id: string
  ): Promise<SuccessApiResponseWithData<ScheduleWithDoctorInfoDto>> {
    const schedule = await this.schedulesService.findByIdWithDoctorInfo(id);
    return {
      success: true,
      message: 'Schedule with doctor info retrieved successfully',
      data: schedule
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update schedule',
    description: 'Update an existing schedule'
  })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiBody({ type: UpdateScheduleDto })
  @ApiResponse({
    status: 200,
    description: 'Schedule updated successfully',
    type: SuccessApiResponseWithData<ScheduleResponseDto>
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error'
  })
  @ApiResponse({
    status: 404,
    description: 'Schedule not found'
  })
  @ApiResponse({
    status: 409,
    description: 'Updated schedule conflicts with existing schedule'
  })
  async updateSchedule(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto
  ): Promise<SuccessApiResponseWithData<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.updateSchedule(id, updateScheduleDto);
    return {
      success: true,
      message: 'Schedule updated successfully',
      data: schedule
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete schedule',
    description: 'Delete a schedule and all its slots (if no appointments exist)'
  })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({
    status: 204,
    description: 'Schedule deleted successfully'
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete schedule with existing appointments'
  })
  @ApiResponse({
    status: 404,
    description: 'Schedule not found'
  })
  async deleteSchedule(@Param('id') id: string): Promise<void> {
    await this.schedulesService.deleteSchedule(id);
  }

  // Slot endpoints

  @Post('slots')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new slot',
    description: 'Create a single time slot within a schedule'
  })
  @ApiBody({ type: CreateSlotDto })
  @ApiResponse({
    status: 201,
    description: 'Slot created successfully',
    type: SuccessApiResponseWithData<SlotResponseDto>
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or slot time outside schedule'
  })
  @ApiResponse({
    status: 404,
    description: 'Schedule not found'
  })
  @ApiResponse({
    status: 409,
    description: 'Slot conflicts with existing slot'
  })
  async createSlot(
    @Body() createSlotDto: CreateSlotDto
  ): Promise<SuccessApiResponseWithData<SlotResponseDto>> {
    const slot = await this.schedulesService.createSlot(createSlotDto);
    return {
      success: true,
      message: 'Slot created successfully',
      data: slot
    };
  }

  @Post('slots/multiple')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create multiple slots',
    description: 'Create multiple time slots for a schedule with specified duration and breaks'
  })
  @ApiBody({ type: CreateMultipleSlotsDto })
  @ApiResponse({
    status: 201,
    description: 'Slots created successfully',
    type: SuccessApiResponseWithData<SlotResponseDto[]>
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error'
  })
  @ApiResponse({
    status: 404,
    description: 'Schedule not found'
  })
  async createMultipleSlots(
    @Body() createMultipleSlotsDto: CreateMultipleSlotsDto
  ): Promise<SuccessApiResponseWithData<SlotResponseDto[]>> {
    const slots = await this.schedulesService.createMultipleSlots(createMultipleSlotsDto);
    return {
      success: true,
      message: `${slots.length} slots created successfully`,
      data: slots
    };
  }

  @Get('slots/:id')
  @ApiOperation({
    summary: 'Get slot by ID',
    description: 'Retrieve a specific time slot by its ID'
  })
  @ApiParam({ name: 'id', description: 'Slot ID' })
  @ApiResponse({
    status: 200,
    description: 'Slot retrieved successfully',
    type: SuccessApiResponseWithData<SlotResponseDto>
  })
  @ApiResponse({
    status: 404,
    description: 'Slot not found'
  })
  async findSlotById(
    @Param('id') id: string
  ): Promise<SuccessApiResponseWithData<SlotResponseDto>> {
    const slot = await this.schedulesService.findSlotById(id);
    return {
      success: true,
      message: 'Slot retrieved successfully',
      data: slot
    };
  }

  @Get('slots/:id/schedule-info')
  @ApiOperation({
    summary: 'Get slot with schedule info',
    description: 'Retrieve a time slot including schedule information'
  })
  @ApiParam({ name: 'id', description: 'Slot ID' })
  @ApiResponse({
    status: 200,
    description: 'Slot with schedule info retrieved successfully',
    type: SuccessApiResponseWithData<SlotWithScheduleInfoDto>
  })
  @ApiResponse({
    status: 404,
    description: 'Slot not found'
  })
  async findSlotByIdWithScheduleInfo(
    @Param('id') id: string
  ): Promise<SuccessApiResponseWithData<SlotWithScheduleInfoDto>> {
    const slot = await this.schedulesService.findSlotByIdWithScheduleInfo(id);
    return {
      success: true,
      message: 'Slot with schedule info retrieved successfully',
      data: slot
    };
  }

  @Put('slots/:id')
  @ApiOperation({
    summary: 'Update slot',
    description: 'Update an existing time slot'
  })
  @ApiParam({ name: 'id', description: 'Slot ID' })
  @ApiBody({ type: UpdateSlotDto })
  @ApiResponse({
    status: 200,
    description: 'Slot updated successfully',
    type: SuccessApiResponseWithData<SlotResponseDto>
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or slot time outside schedule'
  })
  @ApiResponse({
    status: 404,
    description: 'Slot not found'
  })
  @ApiResponse({
    status: 409,
    description: 'Updated slot conflicts with existing slot'
  })
  async updateSlot(
    @Param('id') id: string,
    @Body() updateSlotDto: UpdateSlotDto
  ): Promise<SuccessApiResponseWithData<SlotResponseDto>> {
    const slot = await this.schedulesService.updateSlot(id, updateSlotDto);
    return {
      success: true,
      message: 'Slot updated successfully',
      data: slot
    };
  }

  @Delete('slots/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete slot',
    description: 'Delete a time slot (if no appointment exists)'
  })
  @ApiParam({ name: 'id', description: 'Slot ID' })
  @ApiResponse({
    status: 204,
    description: 'Slot deleted successfully'
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete slot with existing appointment'
  })
  @ApiResponse({
    status: 404,
    description: 'Slot not found'
  })
  async deleteSlot(@Param('id') id: string): Promise<void> {
    await this.schedulesService.deleteSlot(id);
  }

  // Utility endpoints

  @Get('available-slots')
  @ApiOperation({
    summary: 'Get available slots',
    description: 'Get available time slots for a doctor on a specific date, optionally filtered by service duration'
  })
  @ApiQuery({ name: 'doctorId', required: true, description: 'Doctor ID' })
  @ApiQuery({ name: 'date', required: true, description: 'Date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'serviceId', required: false, description: 'Service ID to filter by duration' })
  @ApiResponse({
    status: 200,
    description: 'Available slots retrieved successfully',
    type: SuccessApiResponseWithData<any>
  })
  @ApiResponse({
    status: 400,
    description: 'Doctor not available'
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found'
  })
  async getAvailableSlots(
    @Query() query: AvailableSlotsQueryDto
  ): Promise<SuccessApiResponseWithData<any>> {
    const result = await this.schedulesService.getAvailableSlots(query);
    return {
      success: true,
      message: 'Available slots retrieved successfully',
      data: result
    };
  }
}
