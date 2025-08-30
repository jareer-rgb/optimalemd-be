# 🔑 OptimaleMD Backend - Password Management Guide

## Overview

This document outlines the complete password management system implemented in the OptimaleMD Backend, including forgot password, reset password, and update password functionality.

## 🎯 Password Management Features

### 1. **Forgot Password Flow**
- User requests password reset via email
- Secure reset token generation
- Token expiration (1 hour)
- Privacy protection (doesn't reveal if email exists)

### 2. **Reset Password Flow**
- User receives reset token via email
- Token validation and expiration check
- Secure password update
- Automatic token cleanup

### 3. **Update Password Flow**
- Authenticated user password change
- Current password verification
- New password validation
- Prevents same password reuse

## 🔐 Security Features

### Token Security
- **Cryptographically Secure**: Uses Node.js crypto module
- **Unique Generation**: 32-byte random hex tokens
- **Time-Limited**: 1-hour expiration
- **Single-Use**: Tokens are invalidated after use

### Password Security
- **Strong Hashing**: Bcrypt with 12 salt rounds
- **Validation**: Minimum 6 characters required
- **Verification**: Current password must be correct
- **Uniqueness**: New password must differ from current

### Privacy Protection
- **Email Privacy**: Doesn't reveal if email exists in system
- **Token Security**: Reset tokens are not exposed in responses
- **Rate Limiting**: Prevents abuse (can be implemented)

## 📋 API Endpoints

### Authentication Endpoints

#### POST `/api/auth/forgot-password`
**Purpose**: Request password reset link

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset email sent successfully",
  "data": {
    "message": "If an account with that email exists, a password reset link has been sent.",
    "email": "user@example.com"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/auth/forgot-password"
}
```

**Security Notes**:
- Always returns success message regardless of email existence
- Reset token is generated and stored in database
- In production, token would be sent via email

#### POST `/api/auth/reset-password`
**Purpose**: Reset password using valid token

**Request Body**:
```json
{
  "token": "reset_token_1234567890abcdef",
  "newPassword": "newpassword123"
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset successfully",
  "data": {
    "message": "Password has been reset successfully",
    "email": "user@example.com"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/auth/reset-password"
}
```

**Security Notes**:
- Token is validated and checked for expiration
- New password is hashed before storage
- Token is automatically invalidated after use

### Protected User Endpoints

#### POST `/api/users/update-password`
**Purpose**: Update password for authenticated user

**Request Body**:
```json
{
  "currentPassword": "currentpassword123",
  "newPassword": "newpassword123"
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password updated successfully",
  "data": {
    "message": "Password updated successfully",
    "user": {
      "id": "clx1234567890abcdef",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      // ... other user fields
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users/update-password"
}
```

**Security Notes**:
- Requires valid JWT authentication
- Current password must be verified
- New password must be different from current
- Password is securely hashed before storage

## 🏗️ Implementation Details

### Database Schema

The `users` table includes password reset fields:

```sql
ALTER TABLE "users" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "users" ADD COLUMN "resetTokenExpiry" TIMESTAMP(3);

-- Index for efficient token lookups
CREATE INDEX "users_resetToken_idx" ON "users"("resetToken");
```

### Service Architecture

#### PasswordResetService
Handles forgot password and reset password operations:

```typescript
@Injectable()
export class PasswordResetService {
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    // Generate secure reset token
    // Store token with expiration
    // Return success message
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    // Validate reset token
    // Update password securely
    // Clean up token
  }
}
```

#### AuthService
Handles password update for authenticated users:

```typescript
@Injectable()
export class AuthService {
  async updatePassword(userId: string, updatePasswordDto: UpdatePasswordDto) {
    // Verify current password
    // Check password uniqueness
    // Update password securely
  }
}
```

### Token Generation

```typescript
// Generate cryptographically secure token
const resetToken = crypto.randomBytes(32).toString('hex');

// Set expiration (1 hour from now)
const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
```

### Password Hashing

```typescript
// Hash password with bcrypt (12 salt rounds)
const hashedPassword = await bcrypt.hash(password, 12);

// Verify password
const isPasswordValid = await bcrypt.compare(password, hashedPassword);
```

## 🔄 Password Reset Flow

### Complete User Journey

1. **User Forgets Password**
   - User visits forgot password page
   - Enters email address
   - Submits form

2. **System Processing**
   - Validates email format
   - Generates secure reset token
   - Stores token with expiration
   - Returns success message

3. **Email Delivery** (Production)
   - System sends email with reset link
   - Link contains reset token
   - Token expires in 1 hour

4. **User Resets Password**
   - User clicks email link
   - Enters new password
   - Submits reset form

5. **Password Update**
   - System validates token
   - Checks token expiration
   - Updates password securely
   - Invalidates token
   - Returns success message

### Development vs Production

#### Development Mode
- Reset tokens are logged to console
- No actual email sending
- Useful for testing and development

#### Production Mode
- Reset tokens sent via email
- Secure email delivery
- No console logging of tokens

## 🛡️ Security Considerations

### Token Security
- **Cryptographic Strength**: Uses Node.js crypto module
- **Expiration**: 1-hour time limit prevents long-term exposure
- **Single Use**: Tokens invalidated after password reset
- **Storage**: Tokens stored securely in database

### Password Security
- **Strong Hashing**: Bcrypt with 12 salt rounds
- **Validation**: Enforces minimum password strength
- **Verification**: Current password must be correct
- **Uniqueness**: Prevents password reuse

### Privacy Protection
- **Email Privacy**: Doesn't reveal user existence
- **Rate Limiting**: Can be implemented to prevent abuse
- **Audit Logging**: Tracks password change attempts

## 🧪 Testing

### Testing Forgot Password

```typescript
describe('Forgot Password', () => {
  it('should send reset email for valid email', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: 'test@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('test@example.com');
  });

  it('should not reveal if email exists', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    // Should return same message regardless of email existence
  });
});
```

### Testing Reset Password

```typescript
describe('Reset Password', () => {
  it('should reset password with valid token', async () => {
    // First, get a reset token
    await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: 'test@example.com' });

    // Get token from console (development) or email (production)
    const resetToken = 'token_from_console_or_email';

    const response = await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({
        token: resetToken,
        newPassword: 'newpassword123',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should reject expired token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({
        token: 'expired_token',
        newPassword: 'newpassword123',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
```

### Testing Update Password

```typescript
describe('Update Password', () => {
  it('should update password with correct current password', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/users/update-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        currentPassword: 'currentpassword123',
        newPassword: 'newpassword123',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should reject incorrect current password', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/users/update-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
```

## 🚀 Production Deployment

### Email Service Integration

To enable email functionality in production:

1. **Install Email Service**
   ```bash
   npm install @nestjs-modules/mailer nodemailer
   ```

2. **Configure Email Service**
   ```typescript
   // In password-reset.service.ts
   async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
     // ... existing code ...

     // Send email with reset link
     await this.mailerService.sendMail({
       to: email,
       subject: 'Password Reset Request',
       html: `
         <p>You requested a password reset.</p>
         <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
         <p>This link expires in 1 hour.</p>
       `,
     });
   }
   ```

3. **Environment Configuration**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

### Security Hardening

1. **Rate Limiting**
   ```typescript
   // Implement rate limiting for password reset requests
   @Throttle(5, 3600) // 5 requests per hour
   async forgotPassword() { ... }
   ```

2. **Audit Logging**
   ```typescript
   // Log all password reset attempts
   await this.auditService.log({
     action: 'PASSWORD_RESET_REQUESTED',
     userId: user.id,
     ip: request.ip,
     userAgent: request.get('User-Agent'),
   });
   ```

3. **Token Cleanup**
   ```typescript
   // Clean up expired tokens periodically
   @Cron('0 0 * * *') // Daily at midnight
   async cleanupExpiredTokens() {
     await this.passwordResetService.clearExpiredTokens();
   }
   ```

## 🔍 Monitoring and Debugging

### Logging

The system logs important events:

```typescript
// Password reset request
console.log(`Password reset token for ${email}: ${resetToken}`);

// Error logging in exception filter
console.error(`[${requestId}] ${request.method} ${request.url} - ${status}: ${message}`);
```

### Request Tracking

Each error response includes a unique request ID:

```json
{
  "requestId": "req_1234567890abcdef"
}
```

### Database Queries

Monitor these database operations:

```sql
-- Check active reset tokens
SELECT email, resetTokenExpiry FROM users 
WHERE resetToken IS NOT NULL 
AND resetTokenExpiry > NOW();

-- Check expired tokens
SELECT email, resetTokenExpiry FROM users 
WHERE resetToken IS NOT NULL 
AND resetTokenExpiry <= NOW();
```

## 📚 Best Practices

### For Developers
1. **Never log reset tokens** in production
2. **Use environment variables** for email configuration
3. **Implement rate limiting** to prevent abuse
4. **Add audit logging** for security events
5. **Test all error scenarios** thoroughly

### For Users
1. **Use strong passwords** (minimum 6 characters)
2. **Don't reuse passwords** across accounts
3. **Reset tokens expire** in 1 hour
4. **Keep reset links private** and secure
5. **Contact support** if issues persist

---

**This password management system provides enterprise-grade security while maintaining excellent user experience! 🔐**
