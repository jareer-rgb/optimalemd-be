import { IsEmail, IsString, MinLength, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseApiResponse } from '../../common/dto/api-response.dto';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    type: String,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'securepassword123',
    minLength: 6,
    type: String,
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({
    description: 'User first name',
    example: 'John',
    type: String,
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    type: String,
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'User email address (must be unique)',
    example: 'john.doe@example.com',
    type: String,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'securepassword123',
    minLength: 6,
    type: String,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890',
    type: String,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'User date of birth (YYYY-MM-DD format)',
    example: '1990-01-01',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'User city',
    example: 'New York',
    type: String,
  })
  @IsOptional()
  @IsString()
  city?: string;
}

// Forgot Password DTO
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address to send reset link',
    example: 'john.doe@example.com',
    type: String,
  })
  @IsEmail()
  email: string;
}

// Reset Password DTO
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Reset token received via email',
    example: 'reset_token_1234567890abcdef',
    type: String,
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'New password (minimum 6 characters)',
    example: 'newpassword123',
    minLength: 6,
    type: String,
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

// Update Password DTO
export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'currentpassword123',
    type: String,
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'New password (minimum 6 characters)',
    example: 'newpassword123',
    minLength: 6,
    type: String,
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

// User data structure for responses
export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: 'clx1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    description: 'User date of birth',
    example: '1990-01-01T00:00:00.000Z',
    nullable: true,
  })
  dateOfBirth: Date | null;

  @ApiProperty({
    description: 'User city',
    example: 'New York',
    nullable: true,
  })
  city: string | null;

  @ApiProperty({
    description: 'Whether the user account is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

// Authentication response data
export class AuthResponseDataDto {
  @ApiProperty({
    description: 'JWT access token for authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'User information',
    type: UserResponseDto,
  })
  user: UserResponseDto;
}

// Authentication response wrapper
export class AuthResponseDto extends BaseApiResponse<AuthResponseDataDto> {}

// Password reset response data
export class PasswordResetResponseDataDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Password reset email sent successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Email address where reset link was sent',
    example: 'john.doe@example.com',
  })
  email: string;
}

// Password reset response wrapper
export class PasswordResetResponseDto extends BaseApiResponse<PasswordResetResponseDataDto> {}

// Password update response data
export class PasswordUpdateResponseDataDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Password updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'User information after password update',
    type: UserResponseDto,
  })
  user: UserResponseDto;
}

// Password update response wrapper
export class PasswordUpdateResponseDto extends BaseApiResponse<PasswordUpdateResponseDataDto> {}
