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
    description: 'Register a new user account with all required medical information and optional fields.',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'User registration data',
    examples: {
      basic: {
        summary: 'Basic Registration',
        description: 'Register with required fields only',
        value: {
          medicalRecordNo: '1234567890',
          title: 'Mr',
          firstName: 'John',
          middleName: 'Michael',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          gender: 'Male',
          completeAddress: '123 Main St, Apt 4B',
          city: 'New York',
          state: 'NY',
          zipcode: '10001',
          primaryEmail: 'john.doe@example.com',
          alternativeEmail: 'john.doe.alternative@example.com',
          primaryPhone: '+1234567890',
          alternativePhone: '+1987654321',
          emergencyContactName: 'Jane Doe',
          emergencyContactRelationship: 'Spouse',
          emergencyContactPhone: '+1234567890',
          referringSource: 'Self',
          consentForTreatment: 'Y',
          hipaaPrivacyNoticeAcknowledgment: 'Y',
          releaseOfMedicalRecordsConsent: 'Y',
          preferredMethodOfCommunication: 'Email',
          disabilityAccessibilityNeeds: 'None',
          password: 'securepassword123',
        } as RegisterDto,
      },
      full: {
        summary: 'Full Registration',
        description: 'Register with all available fields including optional ones',
        value: {
          medicalRecordNo: '1234567890',
          title: 'Dr',
          firstName: 'Jane',
          middleName: 'Elizabeth',
          lastName: 'Smith',
          dateOfBirth: '1985-05-15',
          gender: 'Female',
          completeAddress: '456 Oak Ave, Suite 200',
          city: 'Los Angeles',
          state: 'CA',
          zipcode: '90210',
          primaryEmail: 'jane.smith@example.com',
          alternativeEmail: 'jane.smith.alternative@example.com',
          primaryPhone: '+1234567890',
          alternativePhone: '+1987654321',
          emergencyContactName: 'John Smith',
          emergencyContactRelationship: 'Spouse',
          emergencyContactPhone: '+1234567890',
          referringSource: 'Physician',
          consentForTreatment: 'Y',
          hipaaPrivacyNoticeAcknowledgment: 'Y',
          releaseOfMedicalRecordsConsent: 'Y',
          preferredMethodOfCommunication: 'Phone',
          disabilityAccessibilityNeeds: 'None',
          careProviderPhone: '+1555123456',
          lastFourDigitsSSN: '1234',
          languagePreference: 'English',
          ethnicityRace: 'Caucasian',
          primaryCarePhysician: 'Dr. Johnson',
          insuranceProviderName: 'Blue Cross Blue Shield',
          insurancePolicyNumber: 'POL123456789',
          insuranceGroupNumber: 'GRP987654321',
          insurancePhoneNumber: '+18005551234',
          guarantorResponsibleParty: 'Jane Smith',
          dateOfFirstVisitPlanned: '2024-02-15',
          interpreterRequired: 'N',
          advanceDirectives: 'N',
          password: 'securepassword123',
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
    description: 'Authenticate existing user with primary email and password to receive JWT access token.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials',
    examples: {
      login: {
        summary: 'Login Credentials',
        description: 'Enter your primary email and password',
        value: {
          primaryEmail: 'john.doe@example.com',
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
    description: 'Request a password reset link to be sent to the user\'s primary email address.',
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'Primary email address for password reset',
    examples: {
      forgotPassword: {
        summary: 'Forgot Password Request',
        description: 'Enter your primary email address',
        value: {
          primaryEmail: 'john.doe@example.com',
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
    description: 'Resend email verification link to user\'s primary email address.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        primaryEmail: {
          type: 'string',
          format: 'email',
          example: 'john.doe@example.com',
          description: 'Primary email address to resend verification to',
        },
      },
      required: ['primaryEmail'],
    },
    description: 'Primary email address for verification resend',
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
            primaryEmail: { type: 'string', example: 'john.doe@example.com' },
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
          details: ['primaryEmail must be an email'],
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
  async resendVerification(@Body() body: { primaryEmail: string }): Promise<BaseApiResponse<any>> {
    const data = await this.authService.resendVerification(body.primaryEmail);
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
    description: 'Check if the current user\'s primary email is verified.',
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
            primaryEmail: { type: 'string', example: 'john.doe@example.com' },
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
  async getVerificationStatus(@Query('primaryEmail') primaryEmail: string): Promise<BaseApiResponse<any>> {
    const data = await this.authService.getVerificationStatus(primaryEmail);
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
