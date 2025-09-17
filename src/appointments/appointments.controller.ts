import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
  ApiBody,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  QueryAppointmentsDto,
  CancelAppointmentDto,
  RescheduleAppointmentDto,
  AppointmentResponseDto,
  AppointmentWithRelationsResponseDto,
} from './dto';
import {
  CreateBookingDto,
  RespondToBookingDto,
  BookingResponseDto,
  BookingWithRelationsResponseDto,
} from './dto';
import { BaseApiResponse, PaginatedApiResponse, SuccessApiResponseWithData } from '../common/dto/api-response.dto';

@ApiTags('appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly bookingsService: BookingsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create Appointment',
    description: 'Create a new appointment with comprehensive validation and conflict checking.',
  })
  @ApiBody({
    type: CreateAppointmentDto,
    description: 'Appointment creation data',
    examples: {
      generalConsultation: {
        summary: 'General Consultation',
        description: 'Book a general consultation appointment',
        value: {
          patientId: '123e4567-e89b-12d3-a456-426614174000',
          doctorId: '123e4567-e89b-12d3-a456-426614174001',
          serviceId: '123e4567-e89b-12d3-a456-426614174002',
          slotId: '123e4567-e89b-12d3-a456-426614174003',
          appointmentDate: '2024-12-25',
          appointmentTime: '09:00',
          duration: 30,
          amount: '150.00',
          patientNotes: 'Experiencing chest pain for the last 2 days',
          symptoms: 'Chest pain, shortness of breath'
        } as CreateAppointmentDto,
      },
    },
  })
  @ApiOkResponse({
    description: 'Appointment created successfully',
    type: BaseApiResponse<AppointmentResponseDto>,
    examples: {
      success: {
        summary: 'Appointment Created',
        value: {
          success: true,
          statusCode: 201,
          message: 'Appointment created successfully',
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            patientId: '123e4567-e89b-12d3-a456-426614174001',
            doctorId: '123e4567-e89b-12d3-a456-426614174002',
            serviceId: '123e4567-e89b-12d3-a456-426614174003',
            slotId: '123e4567-e89b-12d3-a456-426614174004',
            appointmentDate: '2024-12-25T00:00:00.000Z',
            appointmentTime: '09:00',
            duration: 30,
            status: 'PENDING',
            amount: '150.00',
            isPaid: false,
            scheduledAt: '2024-12-20T10:00:00.000Z',
            createdAt: '2024-12-20T10:00:00.000Z',
            updatedAt: '2024-12-20T10:00:00.000Z',
          },
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/appointments',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error or business rule violation',
    examples: {
      pastDate: {
        summary: 'Past Date',
        value: {
          success: false,
          statusCode: 400,
          message: 'Appointment date and time cannot be in the past',
          error: 'BadRequestError',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/appointments',
        },
      },
      doubleBooking: {
        summary: 'Double Booking',
        value: {
          success: false,
          statusCode: 400,
          message: 'Doctor already has an appointment at this time',
          error: 'ConflictError',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/appointments',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async createAppointment(
    @Body() createAppointmentDto: CreateAppointmentDto,
  ): Promise<BaseApiResponse<AppointmentResponseDto>> {
    const data = await this.appointmentsService.createAppointment(createAppointmentDto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Appointment created successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/appointments',
    };
  }

  @Post('temporary')
  @ApiOperation({
    summary: 'Create Temporary Appointment',
    description: 'Create a temporary appointment for payment processing.',
  })
  @ApiBody({
    type: CreateAppointmentDto,
    description: 'Temporary appointment creation data',
  })
  @ApiOkResponse({
    description: 'Temporary appointment created successfully',
    type: BaseApiResponse<AppointmentResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'Bad request - validation failed or business rule violation',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async createTemporaryAppointment(
    @Body() createAppointmentDto: CreateAppointmentDto,
  ): Promise<BaseApiResponse<AppointmentResponseDto>> {
    const data = await this.appointmentsService.createTemporaryAppointment(createAppointmentDto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Temporary appointment created successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/appointments/temporary',
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get Appointments',
    description: 'Retrieve appointments with filtering, pagination, and comprehensive data.',
  })
  @ApiQuery({
    name: 'patientId',
    required: false,
    description: 'Filter by patient ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'doctorId',
    required: false,
    description: 'Filter by doctor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'serviceId',
    required: false,
    description: 'Filter by service ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by appointment status',
    enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'],
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter by start date (YYYY-MM-DD)',
    example: '2024-12-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter by end date (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  @ApiOkResponse({
    description: 'Appointments retrieved successfully',
    type: PaginatedApiResponse<AppointmentWithRelationsResponseDto>,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async getAppointments(
    @Query() query: QueryAppointmentsDto,
  ): Promise<PaginatedApiResponse<AppointmentWithRelationsResponseDto>> {
    const { appointments, total } = await this.appointmentsService.findAll(query);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Appointments retrieved successfully',
      data: appointments,
      timestamp: new Date().toISOString(),
      path: '/api/appointments',
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  @Get('patient/:patientId')
  @ApiOperation({
    summary: 'Get Patient Appointments',
    description: 'Retrieve appointments for a specific patient.',
  })
  @ApiParam({
    name: 'patientId',
    description: 'Patient ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'Patient appointments retrieved successfully',
    type: PaginatedApiResponse<AppointmentWithRelationsResponseDto>,
  })
  @ApiNotFoundResponse({
    description: 'Patient not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getPatientAppointments(
    @Param('patientId') patientId: string,
    @Query() query: QueryAppointmentsDto,
  ): Promise<PaginatedApiResponse<AppointmentWithRelationsResponseDto>> {
    const { appointments, total } = await this.appointmentsService.getPatientAppointments(patientId, query);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Patient appointments retrieved successfully',
      data: appointments,
      timestamp: new Date().toISOString(),
      path: `/api/appointments/patient/${patientId}`,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  @Get('doctor/:doctorId')
  @ApiOperation({
    summary: 'Get Doctor Appointments',
    description: 'Retrieve appointments for a specific doctor.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'Doctor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'Doctor appointments retrieved successfully',
    type: PaginatedApiResponse<AppointmentWithRelationsResponseDto>,
  })
  @ApiNotFoundResponse({
    description: 'Doctor not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getDoctorAppointments(
    @Param('doctorId') doctorId: string,
    @Query() query: QueryAppointmentsDto,
  ): Promise<PaginatedApiResponse<AppointmentWithRelationsResponseDto>> {
    const { appointments, total } = await this.appointmentsService.getDoctorAppointments(doctorId, query);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Doctor appointments retrieved successfully',
      data: appointments,
      timestamp: new Date().toISOString(),
      path: `/api/appointments/doctor/${doctorId}`,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  @Get('upcoming')
  @ApiOperation({
    summary: 'Get Upcoming Appointments',
    description: 'Retrieve upcoming appointments for the current user.',
  })
  @ApiQuery({
    name: 'userType',
    required: true,
    description: 'Type of user (patient or doctor)',
    enum: ['patient', 'doctor'],
  })
  @ApiOkResponse({
    description: 'Upcoming appointments retrieved successfully',
    type: BaseApiResponse<AppointmentWithRelationsResponseDto[]>,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getUpcomingAppointments(
    @CurrentUser() user: any,
    @Query('userType') userType: 'patient' | 'doctor',
  ): Promise<BaseApiResponse<AppointmentWithRelationsResponseDto[]>> {
    const data = await this.appointmentsService.getUpcomingAppointments(user.id, userType);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Upcoming appointments retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/appointments/upcoming',
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get Appointment Statistics',
    description: 'Retrieve appointment statistics with optional filtering.',
  })
  @ApiQuery({
    name: 'doctorId',
    required: false,
    description: 'Filter by doctor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter by start date (YYYY-MM-DD)',
    example: '2024-12-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter by end date (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiOkResponse({
    description: 'Appointment statistics retrieved successfully',
    type: BaseApiResponse<any>,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getAppointmentStats(
    @Query('doctorId') doctorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<BaseApiResponse<any>> {
    const data = await this.appointmentsService.getAppointmentStats(
      doctorId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Appointment statistics retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/appointments/stats',
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Appointment by ID',
    description: 'Retrieve a specific appointment by ID with full details.',
  })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'Appointment retrieved successfully',
    type: BaseApiResponse<AppointmentWithRelationsResponseDto>,
  })
  @ApiNotFoundResponse({
    description: 'Appointment not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getAppointment(@Param('id') id: string): Promise<BaseApiResponse<AppointmentWithRelationsResponseDto>> {
    const data = await this.appointmentsService.findById(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Appointment retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/appointments/${id}`,
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update Appointment',
    description: 'Update an existing appointment with validation and business rule enforcement.',
  })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateAppointmentDto,
    description: 'Appointment update data',
  })
  @ApiOkResponse({
    description: 'Appointment updated successfully',
    type: BaseApiResponse<AppointmentResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or business rule violation',
  })
  @ApiNotFoundResponse({
    description: 'Appointment not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async updateAppointment(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ): Promise<BaseApiResponse<AppointmentResponseDto>> {
    const data = await this.appointmentsService.updateAppointment(id, updateAppointmentDto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Appointment updated successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/appointments/${id}`,
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete Appointment',
    description: 'Delete a cancelled appointment (admin only).',
  })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({
    status: 204,
    description: 'Appointment deleted successfully',
  })
  @ApiBadRequestResponse({
    description: 'Cannot delete non-cancelled appointments',
  })
  @ApiNotFoundResponse({
    description: 'Appointment not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async deleteAppointment(@Param('id') id: string): Promise<void> {
    await this.appointmentsService.deleteAppointment(id);
  }

  // Booking endpoints
  @Post('bookings')
  @ApiOperation({
    summary: 'Create Booking Request',
    description: 'Create a new booking request for an appointment.',
  })
  @ApiBody({
    type: CreateBookingDto,
    description: 'Booking creation data',
  })
  @ApiOkResponse({
    description: 'Booking request created successfully',
    type: BaseApiResponse<BookingResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or business rule violation',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async createBooking(
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<BaseApiResponse<BookingResponseDto>> {
    const data = await this.bookingsService.createBooking(createBookingDto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Booking request created successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/appointments/bookings',
    };
  }

  @Get('bookings/pending/:doctorId')
  @ApiOperation({
    summary: 'Get Pending Bookings',
    description: 'Retrieve pending booking requests for a doctor.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'Doctor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'Pending bookings retrieved successfully',
    type: BaseApiResponse<BookingWithRelationsResponseDto[]>,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getPendingBookings(
    @Param('doctorId') doctorId: string,
  ): Promise<BaseApiResponse<BookingWithRelationsResponseDto[]>> {
    const data = await this.bookingsService.getPendingBookings(doctorId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Pending bookings retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/appointments/bookings/pending/${doctorId}`,
    };
  }

  @Post('bookings/:id/respond')
  @ApiOperation({
    summary: 'Respond to Booking',
    description: 'Doctor responds to a booking request with suggestions.',
  })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: RespondToBookingDto,
    description: 'Doctor response data',
  })
  @ApiOkResponse({
    description: 'Booking response submitted successfully',
    type: BaseApiResponse<BookingResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or business rule violation',
  })
  @ApiNotFoundResponse({
    description: 'Booking not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async respondToBooking(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() respondToBookingDto: RespondToBookingDto,
  ): Promise<BaseApiResponse<BookingResponseDto>> {
    const data = await this.bookingsService.respondToBooking(id, user.id, respondToBookingDto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Booking response submitted successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/appointments/bookings/${id}/respond`,
    };
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel Appointment',
    description: 'Cancel an appointment with 1-hour advance notice requirement.',
  })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: CancelAppointmentDto,
    description: 'Cancellation data',
  })
  @ApiOkResponse({
    description: 'Appointment cancelled successfully',
    type: BaseApiResponse<AppointmentResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or business rule violation',
    examples: {
      tooLate: {
        summary: 'Too Late to Cancel',
        value: {
          success: false,
          statusCode: 400,
          message: 'Appointments can only be cancelled at least 1 hour in advance',
          error: 'BadRequestError',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/appointments/123e4567-e89b-12d3-a456-426614174000/cancel',
        },
      },
      alreadyCancelled: {
        summary: 'Already Cancelled',
        value: {
          success: false,
          statusCode: 400,
          message: 'Appointment is already cancelled',
          error: 'BadRequestError',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/appointments/123e4567-e89b-12d3-a456-426614174000/cancel',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Appointment not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async cancelAppointment(
    @Param('id') id: string,
    @Body() cancelAppointmentDto: CancelAppointmentDto,
  ): Promise<BaseApiResponse<AppointmentResponseDto>> {
    const data = await this.appointmentsService.cancelAppointment(id, cancelAppointmentDto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Appointment cancelled successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/appointments/${id}/cancel`,
    };
  }

  @Patch(':id/reschedule')
  @ApiOperation({
    summary: 'Reschedule Appointment',
    description: 'Reschedule an appointment to a new date and time slot.',
  })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: RescheduleAppointmentDto,
    description: 'Reschedule data',
  })
  @ApiOkResponse({
    description: 'Appointment rescheduled successfully',
    type: BaseApiResponse<AppointmentResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or business rule violation',
    examples: {
      slotUnavailable: {
        summary: 'Slot Not Available',
        value: {
          success: false,
          statusCode: 400,
          message: 'New slot is not available',
          error: 'BadRequestError',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/appointments/123e4567-e89b-12d3-a456-426614174000/reschedule',
        },
      },
      insufficientDuration: {
        summary: 'Insufficient Duration',
        value: {
          success: false,
          statusCode: 400,
          message: 'New slot duration is insufficient for this service',
          error: 'BadRequestError',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/appointments/123e4567-e89b-12d3-a456-426614174000/reschedule',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Appointment not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async rescheduleAppointment(
    @Param('id') id: string,
    @Body() rescheduleAppointmentDto: RescheduleAppointmentDto,
  ): Promise<BaseApiResponse<AppointmentResponseDto>> {
    const data = await this.appointmentsService.rescheduleAppointment(id, rescheduleAppointmentDto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Appointment rescheduled successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/appointments/${id}/reschedule`,
    };
  }

  @Get('doctor/:doctorId/schedule')
  @ApiOperation({
    summary: 'Get Doctor Schedule',
    description: 'Get doctor schedule with filtering by date, status, and appointment type.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'Doctor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Filter by specific date (YYYY-MM-DD)',
    example: '2024-12-25',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by appointment status',
    enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'],
  })
  @ApiQuery({
    name: 'appointmentType',
    required: false,
    description: 'Filter by appointment type',
    enum: ['TELEMEDICINE', 'IN_PERSON'],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  @ApiOkResponse({
    description: 'Doctor schedule retrieved successfully',
    type: PaginatedApiResponse<AppointmentWithRelationsResponseDto>,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getDoctorSchedule(
    @Param('doctorId') doctorId: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('appointmentType') appointmentType?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<PaginatedApiResponse<AppointmentWithRelationsResponseDto>> {
    const query = {
      doctorId,
      startDate: date,
      endDate: date,
      status: status as any,
      appointmentType: appointmentType as any,
      page,
      limit,
    };
    
    const { appointments, total } = await this.appointmentsService.getDoctorAppointments(doctorId, query);
    
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Doctor schedule retrieved successfully',
      data: appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
      path: `/api/appointments/doctor/${doctorId}/schedule`,
    };
  }

  @Get('doctor/:doctorId/queue')
  @ApiOperation({
    summary: 'Get Doctor Patient Queue',
    description: 'Get patient queue for a doctor with status filtering.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'Doctor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by appointment status',
    enum: ['SCHEDULED', 'WAITING_ROOM', 'IN_VISIT', 'COMPLETED', 'NO_SHOW'],
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Filter by specific date (YYYY-MM-DD), defaults to today',
    example: '2024-12-25',
  })
  @ApiOkResponse({
    description: 'Patient queue retrieved successfully',
    type: BaseApiResponse<any>,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getDoctorQueue(
    @Param('doctorId') doctorId: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
  ): Promise<BaseApiResponse<any>> {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const where: any = {
      doctorId,
      appointmentDate: {
        gte: targetDate,
        lt: nextDay,
      },
    };

    // Map frontend status to database status
    if (status) {
      const statusMap = {
        'SCHEDULED': 'CONFIRMED',
        'WAITING_ROOM': 'CONFIRMED', // Assuming waiting room patients are confirmed
        'IN_VISIT': 'IN_PROGRESS',
        'COMPLETED': 'COMPLETED',
        'NO_SHOW': 'NO_SHOW',
      };
      where.status = statusMap[status] || status;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryEmail: true,
            primaryPhone: true,
            dateOfBirth: true,
          }
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            category: true
          }
        },
        slot: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            schedule: {
              select: {
                date: true
              }
            }
          }
        }
      },
      orderBy: [
        { appointmentTime: 'asc' }
      ]
    });

    // Transform the data to match the frontend expectations
    const queueData = appointments.map(appointment => ({
      id: appointment.id,
      time: appointment.appointmentTime,
      patient: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      status: this.mapStatusToQueueStatus(appointment.status),
      appointmentType: 'IN_PERSON', // Default to in-person since appointmentType is not in the model
      age: this.calculateAge(appointment.patient.dateOfBirth),
      lastVisit: appointment.patient.dateOfBirth ? 'N/A' : 'N/A', // This would need to be calculated from previous appointments
      purpose: appointment.service?.name || 'General Consultation',
      patientId: appointment.patient.id,
      patientEmail: appointment.patient.primaryEmail,
      patientPhone: appointment.patient.primaryPhone,
    }));

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Patient queue retrieved successfully',
      data: queueData,
      timestamp: new Date().toISOString(),
      path: `/api/appointments/doctor/${doctorId}/queue`,
    };
  }

  private mapStatusToQueueStatus(dbStatus: string): string {
    const statusMap = {
      'PENDING': 'SCHEDULED',
      'CONFIRMED': 'SCHEDULED',
      'IN_PROGRESS': 'IN_VISIT',
      'COMPLETED': 'COMPLETED',
      'CANCELLED': 'SCHEDULED',
      'NO_SHOW': 'NO_SHOW',
      'RESCHEDULED': 'SCHEDULED',
    };
    return statusMap[dbStatus] || 'SCHEDULED';
  }

  private calculateAge(dateOfBirth: Date | null): number {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}
