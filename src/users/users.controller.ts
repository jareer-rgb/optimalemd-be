import { Controller, Get, Put, Body, UseGuards, Post } from '@nestjs/common';
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
  ApiParam
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { BaseApiResponse, SuccessApiResponse } from '../common/dto/api-response.dto';
import { UserResponseDto, UpdatePasswordDto, PasswordUpdateResponseDto } from '../auth/dto/auth.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get User Profile',
    description: 'Retrieve the current authenticated user\'s profile information.',
  })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    type: BaseApiResponse<UserResponseDto>,
    examples: {
      success: {
        summary: 'Profile Retrieved',
        value: {
          success: true,
          statusCode: 200,
          message: 'User profile retrieved successfully',
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Mr',
            firstName: 'John',
            middleName: 'Michael',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01T00:00:00.000Z',
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
            careProviderPhone: null,
            lastFourDigitsSSN: null,
            languagePreference: null,
            ethnicityRace: null,
            primaryCarePhysician: null,
            insuranceProviderName: null,
            insurancePolicyNumber: null,
            insuranceGroupNumber: null,
            insurancePhoneNumber: null,
            guarantorResponsibleParty: null,
            dateOfRegistration: '2024-01-01T00:00:00.000Z',
            dateOfFirstVisitPlanned: null,
            interpreterRequired: null,
            advanceDirectives: null,
            isActive: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/profile',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
    examples: {
      noToken: {
        summary: 'No Token Provided',
        value: {
          success: false,
          statusCode: 401,
          message: 'Unauthorized',
          error: 'AuthenticationError',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/profile',
          requestId: 'req_1234567890abcdef',
        },
      },
      invalidToken: {
        summary: 'Invalid Token',
        value: {
          success: false,
          statusCode: 401,
          message: 'Unauthorized',
          error: 'AuthenticationError',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/profile',
          requestId: 'req_1234567890abcdef',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    examples: {
      userNotFound: {
        summary: 'User Not Found',
        value: {
          success: false,
          statusCode: 404,
          message: 'User not found',
          error: 'NotFoundError',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/profile',
          requestId: 'req_1234567890abcdef',
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    examples: {
      serverError: {
        summary: 'Server Error',
        value: {
          success: false,
          statusCode: 500,
          message: 'Internal server error',
          error: 'InternalServerError',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/profile',
          requestId: 'req_1234567890abcdef',
        },
      },
    },
  })
  async getProfile(@CurrentUser() user: any): Promise<BaseApiResponse<UserResponseDto>> {
    const data = await this.usersService.findById(user.id);
    return {
      success: true,
      statusCode: 200,
      message: 'User profile retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/users/profile',
    };
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Update User Profile',
    description: 'Update the current authenticated user\'s profile information. Only include the fields you want to update.',
  })
  @ApiBody({
    description: 'Profile update data (all fields optional)',
    examples: {
      basic: {
        summary: 'Update Basic Info',
        description: 'Update first and last name',
        value: {
          firstName: 'John',
          lastName: 'Smith',
        },
      },
      contact: {
        summary: 'Update Contact Info',
        description: 'Update phone and city',
        value: {
          phone: '+1987654321',
          city: 'Los Angeles',
        },
      },
      full: {
        summary: 'Update Full Profile',
        description: 'Update all available fields',
        value: {
          firstName: 'John',
          lastName: 'Smith',
          phone: '+1987654321',
          city: 'Los Angeles',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'User profile updated successfully',
    type: BaseApiResponse<UserResponseDto>,
    examples: {
      success: {
        summary: 'Profile Updated',
        value: {
          success: true,
          statusCode: 200,
          message: 'User profile updated successfully',
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Mr',
            firstName: 'John',
            middleName: 'Michael',
            lastName: 'Smith',
            dateOfBirth: '1990-01-01T00:00:00.000Z',
            gender: 'Male',
            completeAddress: '456 Oak Ave, Suite 200',
            city: 'Los Angeles',
            state: 'CA',
            zipcode: '90210',
            primaryEmail: 'john.doe@example.com',
            alternativeEmail: 'john.doe.alternative@example.com',
            primaryPhone: '+1987654321',
            alternativePhone: '+1234567890',
            emergencyContactName: 'Jane Doe',
            emergencyContactRelationship: 'Spouse',
            emergencyContactPhone: '+1234567890',
            referringSource: 'Self',
            consentForTreatment: 'Y',
            hipaaPrivacyNoticeAcknowledgment: 'Y',
            releaseOfMedicalRecordsConsent: 'Y',
            preferredMethodOfCommunication: 'Email',
            disabilityAccessibilityNeeds: 'None',
            careProviderPhone: null,
            lastFourDigitsSSN: null,
            languagePreference: null,
            ethnicityRace: null,
            primaryCarePhysician: null,
            insuranceProviderName: null,
            insurancePolicyNumber: null,
            insuranceGroupNumber: null,
            insurancePhoneNumber: null,
            guarantorResponsibleParty: null,
            dateOfRegistration: '2024-01-01T00:00:00.000Z',
            dateOfFirstVisitPlanned: null,
            interpreterRequired: null,
            advanceDirectives: null,
            isActive: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/profile',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error - invalid input data',
    examples: {
      invalidData: {
        summary: 'Invalid Data',
        value: {
          success: false,
          statusCode: 400,
          message: 'Validation failed',
          error: 'ValidationError',
          details: ['firstName should not be empty'],
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/profile',
          requestId: 'req_1234567890abcdef',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
    examples: {
      noToken: {
        summary: 'No Token Provided',
        value: {
          success: false,
          statusCode: 401,
          message: 'Unauthorized',
          error: 'AuthenticationError',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/profile',
          requestId: 'req_1234567890abcdef',
        },
      },
      invalidToken: {
        summary: 'Invalid Token',
        value: {
          success: false,
          statusCode: 401,
          message: 'Unauthorized',
          error: 'AuthenticationError',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/profile',
          requestId: 'req_1234567890abcdef',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    examples: {
      userNotFound: {
        summary: 'User Not Found',
        value: {
          success: false,
          statusCode: 404,
          message: 'User not found',
          error: 'NotFoundError',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/profile',
          requestId: 'req_1234567890abcdef',
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    examples: {
      serverError: {
        summary: 'Server Error',
        value: {
          success: false,
          statusCode: 500,
          message: 'Internal server error',
          error: 'InternalServerError',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/profile',
          requestId: 'req_1234567890abcdef',
        },
      },
    },
  })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateData: any,
  ): Promise<BaseApiResponse<UserResponseDto>> {
    const data = await this.usersService.updateProfile(user.id, updateData);
    return {
      success: true,
      statusCode: 200,
      message: 'User profile updated successfully',
      data,
      timestamp: new Date().toISOString(),
      path: '/api/users/profile',
    };
  }

  @Post('update-password')
  @ApiOperation({
    summary: 'Update Password',
    description: 'Update the current authenticated user\'s password. Requires current password verification.',
  })
  @ApiBody({
    type: UpdatePasswordDto,
    description: 'Current and new password',
    examples: {
      updatePassword: {
        summary: 'Update Password',
        description: 'Enter current password and new password',
        value: {
          currentPassword: 'currentpassword123',
          newPassword: 'newpassword123',
        } as UpdatePasswordDto,
      },
    },
  })
  @ApiOkResponse({
    description: 'Password updated successfully',
    type: PasswordUpdateResponseDto,
    examples: {
      success: {
        summary: 'Password Updated',
        value: {
          success: true,
          statusCode: 200,
          message: 'Password updated successfully',
          data: {
            message: 'Password updated successfully',
            user: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              title: 'Mr',
              firstName: 'John',
              middleName: 'Michael',
              lastName: 'Doe',
              dateOfBirth: '1990-01-01T00:00:00.000Z',
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
              careProviderPhone: null,
              lastFourDigitsSSN: null,
              languagePreference: null,
              ethnicityRace: null,
              primaryCarePhysician: null,
              insuranceProviderName: null,
              insurancePolicyNumber: null,
              insuranceGroupNumber: null,
              insurancePhoneNumber: null,
              guarantorResponsibleParty: null,
              dateOfRegistration: '2024-01-01T00:00:00.000Z',
              dateOfFirstVisitPlanned: null,
              interpreterRequired: null,
              advanceDirectives: null,
              isActive: true,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          },
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/update-password',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error or same password',
    examples: {
      samePassword: {
        summary: 'Same Password',
        value: {
          success: false,
          statusCode: 400,
          message: 'New password must be different from current password',
          error: 'ValidationError',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/update-password',
          requestId: 'req_1234567890abcdef',
        },
      },
      shortPassword: {
        summary: 'Password Too Short',
        value: {
          success: false,
          statusCode: 400,
          message: 'Validation failed',
          error: 'ValidationError',
          details: ['newPassword must be longer than or equal to 6 characters'],
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/update-password',
          requestId: 'req_1234567890abcdef',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid current password',
    examples: {
      invalidCurrentPassword: {
        summary: 'Invalid Current Password',
        value: {
          success: false,
          statusCode: 401,
          message: 'Current password is incorrect',
          error: 'AuthenticationError',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/update-password',
          requestId: 'req_1234567890abcdef',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    examples: {
      userNotFound: {
        summary: 'User Not Found',
        value: {
          success: false,
          statusCode: 404,
          message: 'User not found',
          error: 'NotFoundError',
          timestamp: '2024-01-01-01T00:00:00.000Z',
          path: '/api/users/update-password',
          requestId: 'req_1234567890abcdef',
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    examples: {
      serverError: {
        summary: 'Server Error',
        value: {
          success: false,
          statusCode: 500,
          message: 'Internal server error',
          error: 'InternalServerError',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users/update-password',
          requestId: 'req_1234567890abcdef',
        },
      },
    },
  })
  async updatePassword(
    @CurrentUser() user: any,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<PasswordUpdateResponseDto> {
    const updatedUser = await this.authService.updatePassword(user.id, updatePasswordDto);
    return {
      success: true,
      statusCode: 200,
      message: 'Password updated successfully',
      data: {
        message: 'Password updated successfully',
        user: updatedUser,
      },
      timestamp: new Date().toISOString(),
      path: '/api/users/update-password',
    };
  }
}
