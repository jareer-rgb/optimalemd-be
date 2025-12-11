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
import { MedicationsService } from './medications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateMedicationDto,
  UpdateMedicationDto,
  MedicationResponseDto,
} from './dto';
import { BaseApiResponse, SuccessApiResponse } from '../common/dto/api-response.dto';

@ApiTags('medications')
@Controller('medications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create Medication',
    description: 'Create a new medication with name, price, and optional discounted price.',
  })
  @ApiBody({
    type: CreateMedicationDto,
    description: 'Medication creation data',
    examples: {
      basic: {
        summary: 'Basic Medication',
        description: 'Create a medication with name and price',
        value: {
          name: 'Aspirin 100mg',
          price: '25.99',
          isActive: true
        } as CreateMedicationDto,
      },
      withDiscount: {
        summary: 'Medication with Discount',
        description: 'Create a medication with discounted price',
        value: {
          name: 'Ibuprofen 200mg',
          price: '30.00',
          discountedPrice: '24.99',
          isActive: true
        } as CreateMedicationDto,
      },
    },
  })
  @ApiOkResponse({
    description: 'Medication created successfully',
    type: BaseApiResponse<MedicationResponseDto>,
    examples: {
      success: {
        summary: 'Medication Created',
        value: {
          success: true,
          statusCode: 201,
          message: 'Medication created successfully',
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Aspirin 100mg',
            price: '25.99',
            discountedPrice: null,
            isActive: true,
            createdAt: '2024-12-20T10:00:00.000Z',
            updatedAt: '2024-12-20T10:00:00.000Z',
          },
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/medications',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error or business rule violation',
    examples: {
      duplicateName: {
        summary: 'Duplicate Medication Name',
        value: {
          success: false,
          statusCode: 400,
          message: 'Medication with this name already exists',
          error: 'ConflictError',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/medications',
        },
      },
      invalidPrice: {
        summary: 'Invalid Price',
        value: {
          success: false,
          statusCode: 400,
          message: 'Price must be a positive number',
          error: 'BadRequestError',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/medications',
        },
      },
      invalidDiscount: {
        summary: 'Invalid Discount Price',
        value: {
          success: false,
          statusCode: 400,
          message: 'Discounted price must be less than regular price',
          error: 'BadRequestError',
          timestamp: '2024-12-20T10:00:00.000Z',
          path: '/api/medications',
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
  async createMedication(
    @Body() createMedicationDto: CreateMedicationDto,
  ): Promise<BaseApiResponse<MedicationResponseDto>> {
    const data = await this.medicationsService.createMedication(createMedicationDto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Medication created successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/medications',
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get All Medications',
    description: 'Retrieve all medications with optional filtering by active status.',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
    type: 'boolean',
    example: true,
  })
  @ApiOkResponse({
    description: 'Medications retrieved successfully',
    type: BaseApiResponse<MedicationResponseDto[]>,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async getMedications(
    @Query('isActive') isActive?: string,
  ): Promise<BaseApiResponse<MedicationResponseDto[]>> {
    const activeFilter = isActive !== undefined ? isActive === 'true' : undefined;
    const data = await this.medicationsService.findAll(activeFilter);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Medications retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/medications',
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Medication by ID',
    description: 'Retrieve a specific medication by ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Medication ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'Medication retrieved successfully',
    type: BaseApiResponse<MedicationResponseDto>,
  })
  @ApiNotFoundResponse({
    description: 'Medication not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getMedication(@Param('id') id: string): Promise<BaseApiResponse<MedicationResponseDto>> {
    const data = await this.medicationsService.findById(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Medication retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/medications/${id}`,
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update Medication',
    description: 'Update an existing medication with validation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Medication ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateMedicationDto,
    description: 'Medication update data',
  })
  @ApiOkResponse({
    description: 'Medication updated successfully',
    type: BaseApiResponse<MedicationResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or business rule violation',
  })
  @ApiNotFoundResponse({
    description: 'Medication not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async updateMedication(
    @Param('id') id: string,
    @Body() updateMedicationDto: UpdateMedicationDto,
  ): Promise<BaseApiResponse<MedicationResponseDto>> {
    const data = await this.medicationsService.updateMedication(id, updateMedicationDto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Medication updated successfully',
      data,
      timestamp: new Date().toISOString(),
      path: `/api/medications/${id}`,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete Medication',
    description: 'Delete a medication by ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Medication ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiOkResponse({
    description: 'Medication deleted successfully',
    type: SuccessApiResponse,
  })
  @ApiNotFoundResponse({
    description: 'Medication not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async deleteMedication(
    @Param('id') id: string
  ) {
    await this.medicationsService.deleteMedication(id);
    return {
      success: true,
      statusCode: HttpStatus.NO_CONTENT,
      message: 'Medication deleted successfully',
      timestamp: new Date().toISOString(),
      path: `/api/medications/${id}`,
    };
  }
}

