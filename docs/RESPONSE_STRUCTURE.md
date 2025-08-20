# 🏗️ OptimalEMD Backend - Standardized Response Structure

## Overview

This document outlines the standardized response structure implemented across all API endpoints in the OptimalEMD Backend. This ensures consistency, better debugging, and improved developer experience.

## 🎯 Why Standardized Responses?

- **Consistency**: All endpoints return responses in the same format
- **Debugging**: Easy to identify and track issues with request IDs
- **Frontend Integration**: Predictable response structure for frontend developers
- **Monitoring**: Better logging and error tracking capabilities
- **Documentation**: Clear API contract for all consumers

## 📋 Response Structure Types

### 1. Success Response (`BaseApiResponse<T>`)

```typescript
interface BaseApiResponse<T> {
  success: boolean;        // Always true for success
  statusCode: number;      // HTTP status code
  message: string;         // Human-readable success message
  data: T;                // Response data payload
  timestamp: string;       // ISO timestamp
  path: string;           // API endpoint path
}
```

**Example Success Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "clx1234567890abcdef",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "dateOfBirth": "1990-01-01T00:00:00.000Z",
    "city": "New York",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users/profile"
}
```

### 2. Error Response (`ErrorApiResponse`)

```typescript
interface ErrorApiResponse {
  success: boolean;        // Always false for errors
  statusCode: number;      // HTTP status code
  message: string;         // Human-readable error message
  error: string;           // Error type/category
  details?: string[];      // Detailed error information
  timestamp: string;       // ISO timestamp
  path: string;           // API endpoint path
  requestId: string;      // Unique request ID for tracking
}
```

**Example Error Response:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "error": "ValidationError",
  "details": [
    "email must be an email",
    "password must be longer than or equal to 6 characters"
  ],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/auth/register",
  "requestId": "req_1234567890abcdef"
}
```

### 3. Success Response Without Data (`SuccessApiResponse`)

```typescript
interface SuccessApiResponse {
  success: boolean;        // Always true
  statusCode: number;      // HTTP status code
  message: string;         // Success message
  timestamp: string;       // ISO timestamp
  path: string;           // API endpoint path
}
```

**Example:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile updated successfully",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users/profile"
}
```

### 4. Paginated Response (`PaginatedApiResponse<T>`)

```typescript
interface PaginatedApiResponse<T> extends BaseApiResponse<T[]> {
  pagination: {
    page: number;          // Current page number
    limit: number;         // Items per page
    total: number;         // Total items
    totalPages: number;    // Total pages
    hasNext: boolean;      // Has next page
    hasPrev: boolean;      // Has previous page
  };
}
```

## 🔧 Implementation Details

### Response Interceptor

The `ResponseInterceptor` automatically formats all successful responses:

```typescript
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, BaseApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<BaseApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Auto-format response if not already formatted
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        return {
          success: true,
          statusCode: response.statusCode,
          message: this.getSuccessMessage(request.method, request.url),
          data: data,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
```

### Exception Filter

The `HttpExceptionFilter` automatically formats all error responses:

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // Generate unique request ID
    const requestId = this.generateRequestId();
    
    // Format error response
    const errorResponse: ErrorApiResponse = {
      success: false,
      statusCode: status,
      message,
      error,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    // Log error with request ID
    console.error(`[${requestId}] ${request.method} ${request.url} - ${status}: ${message}`);
    
    response.status(status).json(errorResponse);
  }
}
```

## 📊 Response Field Details

### Common Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | boolean | ✅ | Operation success indicator |
| `statusCode` | number | ✅ | HTTP status code |
| `timestamp` | string | ✅ | ISO 8601 timestamp |
| `path` | string | ✅ | API endpoint path |

### Success Response Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | ✅ | Human-readable success message |
| `data` | T | ✅ | Response data payload |

### Error Response Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | ✅ | Human-readable error message |
| `error` | string | ✅ | Error type/category |
| `details` | string[] | ❌ | Detailed error information |
| `requestId` | string | ✅ | Unique request identifier |

## 🎨 Error Types

The system automatically categorizes errors based on HTTP status codes:

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | `ValidationError` | Input validation failed |
| 401 | `AuthenticationError` | Authentication required/failed |
| 403 | `AuthorizationError` | Insufficient permissions |
| 404 | `NotFoundError` | Resource not found |
| 409 | `ConflictError` | Resource conflict |
| 422 | `ValidationError` | Unprocessable entity |
| 429 | `RateLimitError` | Too many requests |
| 500 | `InternalServerError` | Server error |

## 🔍 Request ID System

### Purpose
- **Error Tracking**: Unique identifier for each request
- **Debugging**: Easy correlation of logs and errors
- **Support**: Customer support can reference specific requests
- **Monitoring**: Track request flow through the system

### Format
```
req_<timestamp>_<random_string>
```

**Example:**
```
req_1704067200000_a1b2c3d4e
```

### Usage
1. **Error Logs**: All errors include the request ID
2. **Response Headers**: Can be included in response headers
3. **Database Logging**: Store with database operations
4. **External Services**: Pass to third-party services

## 📝 Customization

### Adding New Response Types

```typescript
// Create new response type
export class CustomResponseDto<T> extends BaseApiResponse<T> {
  @ApiProperty({
    description: 'Custom field',
    example: 'custom value',
  })
  customField: string;
}

// Use in controller
@Get('custom')
async customEndpoint(): Promise<CustomResponseDto<YourDataType>> {
  // Implementation
}
```

### Custom Error Messages

```typescript
// In service
throw new BadRequestException('Custom error message');

// Automatically formatted as:
{
  "success": false,
  "statusCode": 400,
  "message": "Custom error message",
  "error": "ValidationError",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint",
  "requestId": "req_1234567890abcdef"
}
```

## 🚀 Benefits

### For Developers
- **Consistency**: Predictable response structure
- **Debugging**: Easy error tracking with request IDs
- **Documentation**: Clear API contract
- **Testing**: Simplified test assertions

### For Frontend Teams
- **Predictability**: Same response format everywhere
- **Error Handling**: Consistent error structure
- **User Experience**: Better error messages
- **Integration**: Easier API consumption

### For Operations
- **Monitoring**: Better error tracking
- **Logging**: Structured log data
- **Support**: Easy issue resolution
- **Analytics**: Request pattern analysis

## 📚 Best Practices

### 1. Always Use Standard Types
```typescript
// ✅ Good
async getProfile(): Promise<BaseApiResponse<UserResponseDto>> {
  // Implementation
}

// ❌ Avoid
async getProfile(): Promise<any> {
  // Implementation
}
```

### 2. Provide Meaningful Messages
```typescript
// ✅ Good
message: 'User profile updated successfully'

// ❌ Avoid
message: 'OK'
```

### 3. Use Appropriate Error Types
```typescript
// ✅ Good
throw new UnauthorizedException('Invalid credentials');

// ❌ Avoid
throw new BadRequestException('Invalid credentials');
```

### 4. Include Relevant Details
```typescript
// ✅ Good
details: ['email must be an email', 'password too short']

// ❌ Avoid
details: ['error']
```

## 🔧 Testing

### Testing Success Responses

```typescript
describe('API Response Structure', () => {
  it('should return standardized success response', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 200,
      message: expect.any(String),
      data: expect.any(Object),
      timestamp: expect.any(String),
      path: expect.any(String),
    });
  });
});
```

### Testing Error Responses

```typescript
it('should return standardized error response', async () => {
  const response = await request(app.getHttpServer())
    .get('/api/users/profile');

  expect(response.body).toMatchObject({
    success: false,
    statusCode: 401,
    message: expect.any(String),
    error: 'AuthenticationError',
    timestamp: expect.any(String),
    path: expect.any(String),
    requestId: expect.stringMatching(/^req_/),
  });
});
```

---

**This standardized response structure ensures consistency, maintainability, and excellent developer experience across your entire API! 🚀**
