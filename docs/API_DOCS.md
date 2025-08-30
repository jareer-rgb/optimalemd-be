# OptimaleMD Backend API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication Endpoints

### 1. User Registration
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "securepassword123",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "city": "New York"
}
```

**Required Fields:**
- `firstName` (string)
- `lastName` (string)
- `email` (string, must be unique)
- `password` (string, minimum 6 characters)

**Optional Fields:**
- `phone` (string)
- `dateOfBirth` (string, ISO date format: YYYY-MM-DD)
- `city` (string)

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
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
  }
}
```

**Error Responses:**
- `400` - Validation error
- `409` - User with this email already exists

**Note:** After registration, users must verify their email address before they can log in. A verification email will be sent automatically.

---

### 2. User Login
**POST** `/auth/login`

Authenticate existing user and receive access token.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "securepassword123"
}
```

**Required Fields:**
- `email` (string)
- `password` (string)

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
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
  }
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Invalid credentials, account deactivated, or email not verified

---

### 3. Email Verification
**GET** `/auth/verify-email?token={verification_token}`

Verify user email address using verification token received via email.

**Query Parameters:**
- `token` (string) - Email verification token

**Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Email verified successfully",
  "data": {
    "message": "Email verified successfully",
    "email": "john.doe@example.com"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/auth/verify-email"
}
```

**Error Responses:**
- `400` - Invalid or expired verification token

---

### 4. Resend Email Verification
**POST** `/auth/resend-verification`

Resend email verification link to user's email address.

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Required Fields:**
- `email` (string)

**Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Verification email sent successfully",
  "data": {
    "message": "Verification email sent successfully",
    "email": "john.doe@example.com"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/auth/resend-verification"
}
```

**Error Responses:**
- `400` - User not found or email already verified

---

### 5. Check Email Verification Status
**GET** `/auth/verification-status?email={email}`

Check if a user's email is verified.

**Query Parameters:**
- `email` (string) - Email address to check

**Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Verification status retrieved successfully",
  "data": {
    "isEmailVerified": false,
    "email": "john.doe@example.com"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/auth/verification-status"
}
```

**Error Responses:**
- `404` - User not found

---

## Protected User Endpoints

*All endpoints below require authentication. Include the JWT token in the Authorization header:*
```
Authorization: Bearer <your-jwt-token>
```

### 6. Get User Profile
**GET** `/users/profile`

Retrieve the current user's profile information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
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
}
```

**Error Responses:**
- `401` - Unauthorized (invalid or missing token)
- `404` - User not found

---

### 7. Update User Profile
**PUT** `/users/profile`

Update the current user's profile information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1987654321",
  "city": "Los Angeles"
}
```

**All fields are optional. Only include the fields you want to update.**

**Response (200):**
```json
{
  "id": "clx1234567890abcdef",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1987654321",
  "dateOfBirth": "1990-01-01T00:00:00.000Z",
  "city": "Los Angeles",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Unauthorized (invalid or missing token)
- `404` - User not found

---

## Error Response Format

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

## Authentication Flow

1. **Register**: User creates account → receives JWT token → must verify email
2. **Verify Email**: User clicks verification link → email verified → can now login
3. **Login**: User authenticates → receives JWT token
4. **Protected Routes**: Include JWT token in Authorization header

**Note:** Users cannot log in until their email is verified. If verification email is lost, use the resend verification endpoint.
4. **Token Expiry**: Tokens expire after 7 days (configurable)

## Security Features

- **Password Hashing**: Bcrypt with 12 salt rounds
- **JWT Tokens**: Secure, signed tokens with expiration
- **Input Validation**: Comprehensive validation with class-validator
- **SQL Injection Protection**: Prisma ORM prevents SQL injection
- **CORS Enabled**: Cross-origin requests supported

## Rate Limiting

Currently, no rate limiting is implemented. Consider adding rate limiting for production use.

## Testing the API

You can test the API using tools like:
- **Postman**
- **Insomnia**
- **cURL**
- **Thunder Client (VS Code extension)**

### Example cURL Commands

**Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Get Profile (with token):**
```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```
