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
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateServiceDto,
  UpdateServiceDto,
  QueryServicesDto,
  ServiceResponseDto,
  ServiceWithDoctorPricingDto,
  CreateDoctorServiceDto,
  UpdateDoctorServiceDto,
  DoctorServiceResponseDto,
  DoctorServiceWithRelationsDto,
} from './dto';
import { BaseApiResponse, PaginatedApiResponse, SuccessApiResponse } from '../common/dto/api-response.dto';

@ApiTags('services')
@Controller('services')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create Medical Service',
    description: 'Create a new medical service with comprehensive validation.',
  })
  @ApiBody({
    type: CreateServiceDto,
    description: 'Service creation data',
    examples: {
      generalConsultation: {
        summary: 'General Consultation',
        description: 'Create a general consultation service',
        value: {
          name: 'General Consultation',
          description: 'Comprehensive health assessment and consultation with a healthcare provider',
          category: 'Consultation',
          duration: 30,
          basePrice: '100.00'
        } as CreateServiceDto,
      },
      specialistConsultation: {
        summary: 'Specialist Consultation',
        description: 'Create a specialist consultation service',
        value: {
          name: 'Cardiology Consultation',
          description: 'Specialized consultation with a cardiologist',
          category: 'Specialist',
          duration: 45,
          basePrice: '150.00'
        } as CreateServiceDto,
      },
    },
  })
  @ApiOkResponse({
    description: 'Service created successfully',
    type: BaseApiResponse<ServiceResponseDto>,
    examples: {
      success: {
        summary: 'Service Created',
        value: {
          success: true,
          statusCode: 201,
          message: 'Service created successfully',
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            doctorId: '123e4567-e89b-12d3-a456-426614174000',
            name: 'General Consultation',
            description: 'Comprehensive health assessment and consultation with a healthcare provider',
            category: 'Consultation',
            duration: 30,
            basePrice: '100.00',
            isActive: true,
            createdAt: '2024-12-20T10:00:00.000Z',
            updatedAt: '2024-12-20T10:00:00.000Z',
          },
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/services',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error or business rule violation',
    examples: {
      duplicateName: {
        summary: 'Duplicate Service Name',
        value: {
          success: false,
          statusCode: 400,
          message: 'Service with this name already exists',
          error: 'ConflictError',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/services',
        },
      },
      invalidDuration: {
        summary: 'Invalid Duration',
        value: {
          success: false,
          statusCode: 400,
          message: 'Duration must be between 15 and 480 minutes',
          error: 'BadRequestError',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/services',
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
  async createService(
    @Body() createServiceDto: CreateServiceDto,
  ): Promise<BaseApiResponse<ServiceResponseDto>> {
    const data = await this.servicesService.createService(createServiceDto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Service created successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/services',
    };
  }

  @Get('primary')
  @ApiOperation({
    summary: 'Get Primary Services',
    description: 'Retrieve all primary services.',
  })
  @ApiOkResponse({
    description: 'Primary services retrieved successfully',
    type: BaseApiResponse<any>,
  })
  async getPrimaryServices(): Promise<BaseApiResponse<any>> {
    const data = await this.servicesService.getPrimaryServices();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Primary services retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/services/primary',
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get Services',
    description: 'Retrieve medical services with filtering, pagination, and comprehensive data.',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filter by service name',
    example: 'Consultation',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by service category',
    example: 'Consultation',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
    type: 'boolean',
  })
  @ApiQuery({
    name: 'doctorId',
    required: false,
    description: 'Filter by doctor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
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
    description: 'Services retrieved successfully',
    type: PaginatedApiResponse<ServiceResponseDto>,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async getServices(
    @Query() query: QueryServicesDto,
  ): Promise<PaginatedApiResponse<ServiceResponseDto>> {
    const { services, total } = await this.servicesService.findAll(query);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Services retrieved successfully',
      data: services,
      timestamp: new Date().toISOString(),
      path: '/api/services',
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

  @Get('categories')
  @ApiOperation({
    summary: 'Get Service Categories',
    description: 'Retrieve all available service categories.',
  })
  @ApiOkResponse({
    description: 'Service categories retrieved successfully',
    type: BaseApiResponse<string[]>,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getServiceCategories(): Promise<BaseApiResponse<string[]>> {
    const data = await this.servicesService.getServiceCategories();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Service categories retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/services/categories',
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get Service Statistics',
    description: 'Retrieve comprehensive service statistics.',
  })
  @ApiOkResponse({
    description: 'Service statistics retrieved successfully',
    type: BaseApiResponse<any>,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getServiceStats(): Promise<BaseApiResponse<any>> {
    const data = await this.servicesService.getServiceStats();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Service statistics retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/services/stats',
    };
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search Services',
    description: 'Search services by name, description, or category.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search term',
    example: 'Consultation',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
    example: 'Consultation',
  })
  @ApiQuery({
    name: 'doctorId',
    required: false,
    description: 'Filter by doctor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'Services found successfully',
    type: BaseApiResponse<ServiceResponseDto[]>,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async searchServices(
    @Query('q') searchTerm: string,
    @Query('category') category?: string,
    @Query('doctorId') doctorId?: string,
  ): Promise<BaseApiResponse<ServiceResponseDto[]>> {
    const filters = { category, doctorId };
    const data = await this.servicesService.searchServices(searchTerm, filters);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Services found successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/services/search',
    };
  }

  @Get('category/:category')
  @ApiOperation({
    summary: 'Get Services by Category',
    description: 'Retrieve all services in a specific category.',
  })
  @ApiParam({
    name: 'category',
    description: 'Service category',
    example: 'Consultation',
  })
  @ApiOkResponse({
    description: 'Services by category retrieved successfully',
    type: BaseApiResponse<ServiceResponseDto[]>,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getServicesByCategory(@Param('category') category: string): Promise<BaseApiResponse<ServiceResponseDto[]>> {
    const data = await this.servicesService.getServicesByCategory(category);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Services by category retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/services/category/${category}`,
    };
  }

  @Get('doctor/:doctorId')
  @ApiOperation({
    summary: 'Get Services by Doctor',
    description: 'Retrieve all services created by a specific doctor.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'Doctor ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiOkResponse({
    description: 'Services retrieved successfully',
    type: BaseApiResponse<ServiceResponseDto[]>,
    examples: {
      success: {
        summary: 'Services Retrieved',
        value: {
          success: true,
          statusCode: 200,
          message: 'Services retrieved successfully',
          data: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              doctorId: '123e4567-e89b-12d3-a456-426614174000',
              name: 'General Consultation',
              description: 'Comprehensive health assessment and consultation',
              category: 'Consultation',
              duration: 30,
              basePrice: '100.00',
              isActive: true,
              createdAt: '2024-12-20T10:00:00.000Z',
              updatedAt: '2024-12-20T10:00:00.000Z',
            }
          ],
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/services/doctor/123e4567-e89b-12d3-a456-426614174000',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Doctor not found',
    examples: {
      doctorNotFound: {
        summary: 'Doctor Not Found',
        value: {
          success: false,
          statusCode: 404,
          message: 'Doctor not found',
          error: 'NotFoundError',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/services/doctor/123e4567-e89b-12d3-a456-426614174000',
        },
      },
    },
  })
  async getServicesByDoctor(@Param('doctorId') doctorId: string) {
    const data = await this.servicesService.getServicesByDoctor(doctorId);
    return {
      success: true,
      statusCode: 200,
      message: 'Services retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/services/doctor/${doctorId}`,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Service by ID',
    description: 'Retrieve a specific service by ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'Service retrieved successfully',
    type: BaseApiResponse<ServiceResponseDto>,
  })
  @ApiNotFoundResponse({
    description: 'Service not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getService(@Param('id') id: string): Promise<BaseApiResponse<ServiceResponseDto>> {
    const data = await this.servicesService.findById(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Service retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/services/${id}`,
    };
  }

  @Get(':id/doctors')
  @ApiOperation({
    summary: 'Get Service with Doctor Pricing',
    description: 'Retrieve a specific service with all doctors who offer it and their pricing.',
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'Service with doctor pricing retrieved successfully',
    type: BaseApiResponse<ServiceWithDoctorPricingDto>,
  })
  @ApiNotFoundResponse({
    description: 'Service not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getServiceWithDoctorPricing(@Param('id') id: string): Promise<BaseApiResponse<ServiceWithDoctorPricingDto>> {
    const data = await this.servicesService.findByIdWithDoctorPricing(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Service with doctor pricing retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/services/${id}/doctors`,
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update Service',
    description: 'Update an existing service with validation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateServiceDto,
    description: 'Service update data',
  })
  @ApiOkResponse({
    description: 'Service updated successfully',
    type: BaseApiResponse<ServiceResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or business rule violation',
  })
  @ApiNotFoundResponse({
    description: 'Service not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async updateService(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ): Promise<BaseApiResponse<ServiceResponseDto>> {
    const data = await this.servicesService.updateService(id, updateServiceDto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Service updated successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/services/${id}`,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete Service',
    description: 'Delete a medical service. Only the doctor who created the service can delete it.',
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  // No body required - services can be deleted by any admin
  @ApiOkResponse({
    description: 'Service deleted successfully',
    type: SuccessApiResponse,
    examples: {
      success: {
        summary: 'Service Deleted',
        value: {
          success: true,
          statusCode: 204,
          message: 'Service deleted successfully',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/services/123e4567-e89b-12d3-a456-426614174000',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error or business rule violation',
    examples: {
      unauthorized: {
        summary: 'Unauthorized to Delete',
        value: {
          success: false,
          statusCode: 400,
          message: 'Cannot delete service with active appointments or bookings',
          error: 'BadRequestError',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/services/123e4567-e89b-12d3-a456-426614174000',
        },
      },
      activeAppointments: {
        summary: 'Active Appointments Exist',
        value: {
          success: false,
          statusCode: 400,
          message: 'Cannot delete service with active appointments or bookings',
          error: 'BadRequestError',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/services/123e4567-e89b-12d3-a456-426614174000',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Service not found',
    examples: {
      notFound: {
        summary: 'Service Not Found',
        value: {
          success: false,
          statusCode: 404,
          message: 'Service not found',
          error: 'NotFoundError',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/services/123e4567-e89b-12d3-a456-426614174000',
        },
      },
    },
  })
  async deleteService(
    @Param('id') id: string
  ) {
    await this.servicesService.deleteService(id);
    return {
      success: true,
      statusCode: 204,
      message: 'Service deleted successfully',
      timestamp: new Date().toISOString(),
      path: `/api/services/${id}`,
    };
  }

  // Doctor Service endpoints
  @Post('doctors')
  @ApiOperation({
    summary: 'Create Doctor Service Relationship',
    description: 'Create a relationship between a doctor and a service with pricing.',
  })
  @ApiBody({
    type: CreateDoctorServiceDto,
    description: 'Doctor service relationship data',
  })
  @ApiOkResponse({
    description: 'Doctor service relationship created successfully',
    type: BaseApiResponse<DoctorServiceResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or business rule violation',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async createDoctorService(
    @Body() createDoctorServiceDto: CreateDoctorServiceDto,
  ): Promise<BaseApiResponse<DoctorServiceResponseDto>> {
    const data = await this.servicesService.createDoctorService(createDoctorServiceDto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Doctor service relationship created successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/services/doctors',
    };
  }

  @Get('doctors/:doctorId')
  @ApiOperation({
    summary: 'Get Doctor Services',
    description: 'Retrieve all services offered by a specific doctor.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'Doctor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'Doctor services retrieved successfully',
    type: BaseApiResponse<DoctorServiceWithRelationsDto[]>,
  })
  @ApiNotFoundResponse({
    description: 'Doctor not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getDoctorServices(@Param('doctorId') doctorId: string): Promise<BaseApiResponse<DoctorServiceWithRelationsDto[]>> {
    const data = await this.servicesService.getDoctorServices(doctorId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Doctor services retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/services/doctors/${doctorId}`,
    };
  }

  @Put('doctors/:doctorId/:serviceId')
  @ApiOperation({
    summary: 'Update Doctor Service Relationship',
    description: 'Update pricing or availability of a doctor service relationship.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'Doctor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateDoctorServiceDto,
    description: 'Doctor service update data',
  })
  @ApiOkResponse({
    description: 'Doctor service relationship updated successfully',
    type: BaseApiResponse<DoctorServiceResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or business rule violation',
  })
  @ApiNotFoundResponse({
    description: 'Doctor service relationship not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async updateDoctorService(
    @Param('doctorId') doctorId: string,
    @Param('serviceId') serviceId: string,
    @Body() updateDoctorServiceDto: UpdateDoctorServiceDto,
  ): Promise<BaseApiResponse<DoctorServiceResponseDto>> {
    const data = await this.servicesService.updateDoctorService(doctorId, serviceId, updateDoctorServiceDto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Doctor service relationship updated successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/services/doctors/${doctorId}/${serviceId}`,
    };
  }

  @Get('doctors/:doctorId/:serviceId')
  @ApiOperation({
    summary: 'Get Doctor Service Relationship',
    description: 'Retrieve a specific doctor service relationship with full details.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'Doctor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'Doctor service relationship retrieved successfully',
    type: BaseApiResponse<DoctorServiceWithRelationsDto>,
  })
  @ApiNotFoundResponse({
    description: 'Doctor service relationship not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getDoctorService(
    @Param('doctorId') doctorId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<BaseApiResponse<DoctorServiceWithRelationsDto>> {
    const data = await this.servicesService.getDoctorServiceWithRelations(doctorId, serviceId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Doctor service relationship retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/services/doctors/${doctorId}/${serviceId}`,
    };
  }
}
