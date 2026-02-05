import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { LabOrdersService } from './lab-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { CreateLabOrderDto, LabTestTypeDto, LabOrderDto } from './dto/lab-orders.dto';
import { BaseApiResponse } from '../common/dto/api-response.dto';

@ApiTags('lab-orders')
@Controller('lab-orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LabOrdersController {
  constructor(private readonly labOrdersService: LabOrdersService) {}

  @Get('test-types')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get available lab test types',
    description: 'Retrieves all active lab test types that can be ordered.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lab test types retrieved successfully',
    type: [LabTestTypeDto],
  })
  async getLabTestTypes(): Promise<BaseApiResponse<LabTestTypeDto[]>> {
    const testTypes = await this.labOrdersService.getLabTestTypes();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Lab test types retrieved successfully',
      data: testTypes,
      timestamp: new Date().toISOString(),
      path: '/api/lab-orders/test-types',
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request a lab order',
    description: 'Requests a new lab order with selected test types and scheduled time.',
  })
  @ApiResponse({
    status: 201,
    description: 'Lab order created successfully',
    type: LabOrderDto,
  })
  async createLabOrder(
    @CurrentUser() user: any,
    @Body() createOrderDto: CreateLabOrderDto,
  ): Promise<BaseApiResponse<LabOrderDto>> {
    const order = await this.labOrdersService.createLabOrder(user.id, createOrderDto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Lab order created successfully',
      data: order,
      timestamp: new Date().toISOString(),
      path: '/api/lab-orders',
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get patient lab orders',
    description: 'Retrieves all lab orders for the authenticated patient.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lab orders retrieved successfully',
    type: [LabOrderDto],
  })
  async getPatientLabOrders(@CurrentUser() user: any): Promise<BaseApiResponse<LabOrderDto[]>> {
    const orders = await this.labOrdersService.getPatientLabOrders(user.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Lab orders retrieved successfully',
      data: orders,
      timestamp: new Date().toISOString(),
      path: '/api/lab-orders',
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a specific lab order',
    description: 'Retrieves a specific lab order by ID for the authenticated patient.',
  })
  @ApiParam({
    name: 'id',
    description: 'Lab order ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Lab order retrieved successfully',
    type: LabOrderDto,
  })
  async getLabOrder(
    @CurrentUser() user: any,
    @Param('id') orderId: string,
  ): Promise<BaseApiResponse<LabOrderDto>> {
    const order = await this.labOrdersService.getLabOrderById(orderId, user.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Lab order retrieved successfully',
      data: order,
      timestamp: new Date().toISOString(),
      path: `/api/lab-orders/${orderId}`,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a lab order',
    description: 'Cancels a lab order (only if not completed).',
  })
  @ApiParam({
    name: 'id',
    description: 'Lab order ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Lab order cancelled successfully',
    type: LabOrderDto,
  })
  async cancelLabOrder(
    @CurrentUser() user: any,
    @Param('id') orderId: string,
  ): Promise<BaseApiResponse<LabOrderDto>> {
    const order = await this.labOrdersService.cancelLabOrder(orderId, user.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Lab order cancelled successfully',
      data: order,
      timestamp: new Date().toISOString(),
      path: `/api/lab-orders/${orderId}`,
    };
  }

  @Get('admin/patient/:patientId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get patient lab orders (Admin)',
    description: 'Retrieves all lab orders for a specific patient (admin access).',
  })
  @ApiParam({
    name: 'patientId',
    description: 'Patient ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Lab orders retrieved successfully',
    type: [LabOrderDto],
  })
  async getPatientLabOrdersAdmin(
    @Param('patientId') patientId: string,
  ): Promise<BaseApiResponse<LabOrderDto[]>> {
    const orders = await this.labOrdersService.getPatientLabOrdersAdmin(patientId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Lab orders retrieved successfully',
      data: orders,
      timestamp: new Date().toISOString(),
      path: `/api/lab-orders/admin/patient/${patientId}`,
    };
  }
}

