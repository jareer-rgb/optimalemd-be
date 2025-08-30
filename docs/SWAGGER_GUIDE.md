# 🚀 OptimaleMD Backend - Swagger Integration Guide

## Overview

Your OptimaleMD Backend now includes comprehensive Swagger/OpenAPI documentation that provides:

- 📚 **Interactive API Documentation** - Test endpoints directly from the browser
- 🔐 **JWT Authentication Support** - Easy token management for protected routes
- 📝 **Detailed Request/Response Examples** - Clear understanding of API usage
- ✅ **Validation Rules** - See all input requirements and constraints
- 🎯 **Error Handling Examples** - Understand all possible response scenarios
- 🏗️ **Standardized Response Structure** - Consistent API responses throughout
- 🔑 **Password Management** - Complete password reset and update flows

## 🎯 Accessing Swagger Documentation

Once your application is running, you can access the Swagger UI at:

```
http://localhost:3000/api/docs
```

## 🔐 Authentication in Swagger

### Setting up JWT Token

1. **First, get a token** by using the `/auth/register` or `/auth/login` endpoint
2. **Click the "Authorize" button** (🔒) at the top of the Swagger UI
3. **Enter your JWT token** in the format: `Bearer YOUR_TOKEN_HERE`
4. **Click "Authorize"** to save the token
5. **Now you can test protected endpoints** like `/users/profile`

### Token Format
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📋 Available Endpoints

### 🔐 Authentication Endpoints

#### 1. **POST** `/api/auth/register`
- **Description**: Register a new user account
- **Features**:
  - ✅ Required fields: firstName, lastName, email, password
  - ✅ Optional fields: phone, dateOfBirth, city
  - ✅ Password validation (minimum 6 characters)
  - ✅ Email uniqueness check
  - ✅ Automatic JWT token generation

#### 2. **POST** `/api/auth/login`
- **Description**: Authenticate existing user
- **Features**:
  - ✅ Email and password validation
  - ✅ Account status check (active/inactive)
  - ✅ JWT token generation
  - ✅ User data return

#### 3. **POST** `/api/auth/forgot-password`
- **Description**: Request password reset link
- **Features**:
  - ✅ Email validation
  - ✅ Secure token generation
  - ✅ Token expiration (1 hour)
  - ✅ Privacy protection (doesn't reveal if email exists)

#### 4. **POST** `/api/auth/reset-password`
- **Description**: Reset password using reset token
- **Features**:
  - ✅ Token validation
  - ✅ Password strength validation
  - ✅ Secure password hashing
  - ✅ Automatic token cleanup

### 👤 User Management Endpoints (Protected)

#### 5. **GET** `/api/users/profile`
- **Description**: Get current user's profile
- **Authentication**: Required (JWT Bearer token)
- **Features**:
  - ✅ Returns complete user profile
  - ✅ Excludes sensitive data (password)
  - ✅ Real-time data from database

#### 6. **PUT** `/api/users/profile`
- **Description**: Update user profile
- **Authentication**: Required (JWT Bearer token)
- **Features**:
  - ✅ Partial updates supported
  - ✅ Only send fields you want to change
  - ✅ Validation on all inputs
  - ✅ Automatic timestamp updates

#### 7. **POST** `/api/users/update-password`
- **Description**: Update user password
- **Authentication**: Required (JWT Bearer token)
- **Features**:
  - ✅ Current password verification
  - ✅ New password validation
  - ✅ Prevents same password reuse
  - ✅ Secure password hashing

## 🏗️ Standardized Response Structure

### Success Response Format

All successful responses follow this consistent structure:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { /* response data */ },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint"
}
```

### Error Response Format

All error responses follow this consistent structure:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "error": "ErrorType",
  "details": ["Detailed error information"],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint",
  "requestId": "req_1234567890abcdef"
}
```

### Response Fields Explanation

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `success` | boolean | Indicates if the request was successful | `true` / `false` |
| `statusCode` | number | HTTP status code | `200`, `400`, `401`, etc. |
| `message` | string | Human-readable response message | `"User registered successfully"` |
| `data` | object | Response data payload (success only) | User object, token, etc. |
| `error` | string | Error type/category (error only) | `"ValidationError"`, `"AuthenticationError"` |
| `details` | string[] | Detailed error information (error only) | `["email must be an email"]` |
| `timestamp` | string | ISO timestamp of the response | `"2024-01-01T00:00:00.000Z"` |
| `path` | string | API endpoint path | `"/api/auth/register"` |
| `requestId` | string | Unique request ID for tracking (error only) | `"req_1234567890abcdef"` |

## 🧪 Testing with Swagger UI

### Step-by-Step Testing Guide

1. **Start with Registration**
   - Use `/auth/register` endpoint
   - Fill in the required fields
   - Click "Try it out" → "Execute"
   - Copy the `accessToken` from the response

2. **Set Authentication**
   - Click the "Authorize" button (🔒)
   - Enter: `Bearer YOUR_ACCESS_TOKEN`
   - Click "Authorize"

3. **Test Protected Endpoints**
   - Try `/users/profile` GET endpoint
   - Try `/users/profile` PUT endpoint
   - Try `/users/update-password` endpoint
   - All protected routes now work with your token

4. **Test Password Reset Flow**
   - Use `/auth/forgot-password` with your email
   - Check console for reset token (in production, this would be emailed)
   - Use `/auth/reset-password` with token and new password

5. **Test Different Scenarios**
   - Try invalid data to see validation errors
   - Test with expired/invalid tokens
   - Explore all response examples

## 📊 Request/Response Examples

### Registration Examples

#### Basic Registration
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "securepassword123"
}
```

#### Full Registration
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "password": "securepassword123",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "city": "New York"
}
```

### Login Example
```json
{
  "email": "john.doe@example.com",
  "password": "securepassword123"
}
```

### Forgot Password Example
```json
{
  "email": "john.doe@example.com"
}
```

### Reset Password Example
```json
{
  "token": "reset_token_1234567890abcdef",
  "newPassword": "newpassword123"
}
```

### Update Password Example
```json
{
  "currentPassword": "currentpassword123",
  "newPassword": "newpassword123"
}
```

### Profile Update Examples

#### Update Basic Info
```json
{
  "firstName": "John",
  "lastName": "Smith"
}
```

#### Update Contact Info
```json
{
  "phone": "+1987654321",
  "city": "Los Angeles"
}
```

## 🚨 Error Handling

### Common Error Responses

#### 400 - Bad Request (Validation Errors)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "error": "ValidationError",
  "details": ["email must be an email"],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/auth/register",
  "requestId": "req_1234567890abcdef"
}
```

#### 401 - Unauthorized
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "AuthenticationError",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/auth/login",
  "requestId": "req_1234567890abcdef"
}
```

#### 409 - Conflict (Email Already Exists)
```json
{
  "success": false,
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "ConflictError",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/auth/register",
  "requestId": "req_1234567890abcdef"
}
```

#### 404 - Not Found
```json
{
  "success": false,
  "statusCode": 404,
  "message": "User not found",
  "error": "NotFoundError",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users/profile",
  "requestId": "req_1234567890abcdef"
}
```

## 🔧 Swagger Configuration Features

### What's Included

- ✅ **API Tags** - Organized endpoint grouping
- ✅ **Bearer Authentication** - JWT token support
- ✅ **Request Examples** - Multiple scenarios for each endpoint
- ✅ **Response Examples** - Success and error cases
- ✅ **Detailed Descriptions** - Clear endpoint documentation
- ✅ **Validation Rules** - Input requirements and constraints
- ✅ **Error Documentation** - All possible error scenarios
- ✅ **Interactive Testing** - Try endpoints directly in the browser
- ✅ **Standardized Responses** - Consistent structure across all endpoints
- ✅ **Password Management** - Complete password workflows

### Customization Options

The Swagger configuration in `main.ts` includes:

- **API Title**: "OptimaleMD API"
- **Description**: Comprehensive API description
- **Version**: "1.0"
- **Tags**: Organized endpoint grouping
- **Bearer Auth**: JWT token configuration
- **Persistent Authorization**: Token remembered during session

## 🚀 Getting Started

### 1. Start Your Application
```bash
npm run start:dev
```

### 2. Open Swagger UI
Navigate to: `http://localhost:3000/api/docs`

### 3. Test Authentication Flow
1. Register a new user
2. Login with credentials
3. Use the token to access protected routes

### 4. Test Password Management
1. Use forgot password endpoint
2. Reset password with token
3. Update password while logged in

### 5. Explore All Endpoints
- Test different request scenarios
- View all response examples
- Understand error handling

## 🎯 Benefits of This Integration

- **Developer Experience**: Easy API testing and exploration
- **Documentation**: Always up-to-date API reference
- **Testing**: Built-in endpoint testing capabilities
- **Client Integration**: Clear contract for frontend developers
- **Error Handling**: Comprehensive error scenario documentation
- **Authentication**: Seamless JWT token management
- **Consistency**: Standardized response structure across all endpoints
- **Password Security**: Complete password reset and update workflows
- **Debugging**: Request IDs for easy error tracking

## 🔍 Troubleshooting

### Common Issues

1. **Token Not Working**
   - Ensure format: `Bearer YOUR_TOKEN`
   - Check if token is expired
   - Verify token was copied correctly

2. **Protected Endpoints Not Working**
   - Click "Authorize" button
   - Enter token in correct format
   - Check if token is valid

3. **Swagger UI Not Loading**
   - Verify application is running
   - Check console for errors
   - Ensure port 3000 is accessible

4. **Password Reset Not Working**
   - Check console for reset token (development only)
   - Ensure token hasn't expired (1 hour limit)
   - Verify email exists in database

## 📚 Additional Resources

- **NestJS Swagger Documentation**: https://docs.nestjs.com/openapi/introduction
- **OpenAPI Specification**: https://swagger.io/specification/
- **JWT Authentication**: https://jwt.io/

---

**Happy API Testing! 🚀**

Your OptimaleMD Backend now has professional-grade API documentation with standardized responses and complete password management workflows!
