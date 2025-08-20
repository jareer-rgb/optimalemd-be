import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,

  AuthResponseDto,
  PasswordResetResponseDto,

} from './dto/auth.dto';
import { BaseApiResponse } from '../common/dto/api-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) { }

  @Post('register')
  @ApiOperation({
    summary: 'User Registration',
    description: 'Register a new user account with email, password, and optional profile information.',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'User registration data',
    examples: {
      basic: {
        summary: 'Basic Registration',
        description: 'Register with required fields only',
        value: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          password: 'securepassword123',
        } as RegisterDto,
      },
      full: {
        summary: 'Full Registration',
        description: 'Register with all available fields',
        value: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          password: 'securepassword123',
          phone: '+1234567890',
          dateOfBirth: '1990-01-01',
          city: 'New York',
        } as RegisterDto,
      },
    },
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    const data = await this.authService.register(registerDto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'User registered successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/auth/register',
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User Login',
    description: 'Authenticate existing user with email and password to receive JWT access token.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials',
    examples: {
      login: {
        summary: 'Login Credentials',
        description: 'Enter your email and password',
        value: {
          email: 'john.doe@example.com',
          password: 'securepassword123',
        } as LoginDto,
      },
    },
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    const data = await this.authService.login(loginDto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'User authenticated successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/auth/login',
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Forgot Password',
    description: 'Request a password reset link to be sent to the user\'s email address.',
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'Email address for password reset',
    examples: {
      forgotPassword: {
        summary: 'Forgot Password Request',
        description: 'Enter your email address',
        value: {
          email: 'john.doe@example.com',
        } as ForgotPasswordDto,
      },
    },
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<PasswordResetResponseDto> {
    const data = await this.authService.forgotPassword(forgotPasswordDto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Password reset email sent successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/auth/forgot-password',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset Password',
    description: 'Reset user password using a valid reset token received via email.',
  })
  @ApiBody({
    type: ResetPasswordDto,
    description: 'Reset token and new password',
    examples: {
      resetPassword: {
        summary: 'Reset Password',
        description: 'Enter reset token and new password',
        value: {
          token: 'reset_token_1234567890abcdef',
          newPassword: 'newpassword123',
        } as ResetPasswordDto,
      },
    },
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<PasswordResetResponseDto> {
    const data = await this.authService.resetPassword(resetPasswordDto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Password reset successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/auth/reset-password',
    };
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify Email',
    description: 'Verify user email address using verification token received via email.',
  })
  async verifyEmail(@Query('token') token: string): Promise<BaseApiResponse<any>> {
    const data = await this.authService.verifyEmail(token);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Email verified successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/auth/verify-email',
    };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend Email Verification',
    description: 'Resend email verification link to user\'s email address.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'john.doe@example.com',
          description: 'Email address to resend verification to',
        },
      },
      required: ['email'],
    },
    description: 'Email address for verification resend',
  })
  @ApiOkResponse({
    description: 'Verification email resent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Verification email sent successfully' },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Verification email sent successfully' },
            email: { type: 'string', example: 'john.doe@example.com' },
          },
        },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/api/auth/resend-verification' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error or user not found',
    examples: {
      invalidEmail: {
        summary: 'Invalid Email',
        value: {
          success: false,
          statusCode: 400,
          message: 'Validation failed',
          error: 'ValidationError',
          details: ['email must be an email'],
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/auth/resend-verification',
          requestId: 'req_1234567890abcdef',
        },
      },
      userNotFound: {
        summary: 'User Not Found',
        value: {
          success: false,
          statusCode: 400,
          message: 'User not found',
          error: 'ValidationError',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/auth/resend-verification',
          requestId: 'req_1234567890abcdef',
        },
      },
    },
  })
  async resendVerification(@Body() body: { email: string }): Promise<BaseApiResponse<any>> {
    const data = await this.authService.resendVerification(body.email);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Verification email sent successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/auth/resend-verification',
    };
  }

  @Get('verification-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check Email Verification Status',
    description: 'Check if the current user\'s email is verified.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Verification status retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            isEmailVerified: { type: 'boolean', example: false },
            email: { type: 'string', example: 'john.doe@example.com' },
          },
        },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/api/auth/verification-status' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
    examples: {
      unauthorized: {
        summary: 'Unauthorized',
        value: {
          success: false,
          statusCode: 401,
          message: 'Unauthorized',
          error: 'AuthenticationError',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/auth/verification-status',
          requestId: 'req_1234567890abcdef',
        },
      },
    },
  })
  async getVerificationStatus(@Query('email') email: string): Promise<BaseApiResponse<any>> {
    const data = await this.authService.getVerificationStatus(email);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Verification status retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/auth/verification-status',
    };
  }
}
