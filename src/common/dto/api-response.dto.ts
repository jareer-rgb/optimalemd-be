import { ApiProperty } from '@nestjs/swagger';

// Base response structure
export class BaseApiResponse<T> {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Response data payload',
  })
  data: T;

  @ApiProperty({
    description: 'Timestamp of the response',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'API endpoint path',
    example: '/api/auth/login',
  })
  path: string;
}

// Error response structure
export class ErrorApiResponse {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: false,
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Validation failed',
  })
  message: string;

  @ApiProperty({
    description: 'Error type/category',
    example: 'ValidationError',
  })
  error: string;

  @ApiProperty({
    description: 'Detailed error information',
    example: ['email must be an email', 'password must be longer than or equal to 6 characters'],
  })
  details?: string[];

  @ApiProperty({
    description: 'Timestamp of the error',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'API endpoint path where error occurred',
    example: '/api/auth/register',
  })
  path: string;

  @ApiProperty({
    description: 'Request ID for tracking',
    example: 'req_1234567890abcdef',
    required: false,
  })
  requestId?: string;
}

// Pagination metadata
export class PaginationMeta {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrev: boolean;
}

// Paginated response structure
export class PaginatedApiResponse<T> extends BaseApiResponse<T[]> {
  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  pagination: PaginationMeta;
}

// Success response without data
export class SuccessApiResponse {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Timestamp of the response',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'API endpoint path',
    example: '/api/users/profile',
  })
  path: string;
}
