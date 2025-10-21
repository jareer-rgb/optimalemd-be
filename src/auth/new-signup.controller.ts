import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Body, 
  Param, 
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request
} from '@nestjs/common';
import { NewSignupService } from './new-signup.service';
import { 
  CreateWelcomeOrderDto, 
  UpdateSignupStepDto, 
  GenderStepDto,
  BasicInfoStepDto,
  CheckoutStepDto,
  PasswordStepDto,
  DetailsStepDto,
  CreateUserStepByStepDto
} from './dto/new-signup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth/new-signup')
export class NewSignupController {
  constructor(private readonly newSignupService: NewSignupService) {}

  // Create a new welcome order
  @Post('welcome-order')
  @HttpCode(HttpStatus.CREATED)
  async createWelcomeOrder(@Body() createDto: CreateWelcomeOrderDto) {
    return this.newSignupService.createWelcomeOrder(createDto);
  }

  // Update signup step
  @Put('welcome-order/:welcomeOrderId/step')
  @HttpCode(HttpStatus.OK)
  async updateSignupStep(
    @Param('welcomeOrderId') welcomeOrderId: string,
    @Body() updateDto: UpdateSignupStepDto
  ) {
    return this.newSignupService.updateSignupStep(welcomeOrderId, updateDto);
  }

  // Get signup progress
  @Get('welcome-order/:welcomeOrderId/progress')
  async getSignupProgress(@Param('welcomeOrderId') welcomeOrderId: string) {
    return this.newSignupService.getSignupProgress(welcomeOrderId);
  }

  // Resume signup by email
  @Get('resume')
  async resumeSignupByEmail(@Query('email') email: string) {
    return this.newSignupService.resumeSignupByEmail(email);
  }

  // Complete signup and create user
  @Post('welcome-order/:welcomeOrderId/complete')
  @HttpCode(HttpStatus.CREATED)
  async completeSignup(
    @Param('welcomeOrderId') welcomeOrderId: string,
    @Body() userData: any
  ) {
    return this.newSignupService.completeSignup(welcomeOrderId, userData);
  }

  // Get welcome order details
  @Get('welcome-order/:welcomeOrderId')
  async getWelcomeOrder(@Param('welcomeOrderId') welcomeOrderId: string) {
    return this.newSignupService.getWelcomeOrder(welcomeOrderId);
  }

  // Update payment status
  @Put('welcome-order/:welcomeOrderId/payment')
  @HttpCode(HttpStatus.OK)
  async updatePaymentStatus(
    @Param('welcomeOrderId') welcomeOrderId: string,
    @Body() body: { paymentIntentId: string; status: string }
  ) {
    return this.newSignupService.updatePaymentStatus(
      welcomeOrderId, 
      body.paymentIntentId, 
      body.status as any
    );
  }

  // Step-specific endpoints for easier frontend integration

  // Step 0 - Gender
  @Put('welcome-order/:welcomeOrderId/step/gender')
  @HttpCode(HttpStatus.OK)
  async updateGenderStep(
    @Param('welcomeOrderId') welcomeOrderId: string,
    @Body() genderData: GenderStepDto
  ) {
    return this.newSignupService.updateSignupStep(welcomeOrderId, {
      stepNumber: 0,
      stepName: 'Gender',
      stepData: genderData,
      isCompleted: true,
      isValid: true,
    });
  }

  // Step 1 - Basic Info
  @Put('welcome-order/:welcomeOrderId/step/basic-info')
  @HttpCode(HttpStatus.OK)
  async updateBasicInfoStep(
    @Param('welcomeOrderId') welcomeOrderId: string,
    @Body() basicInfoData: BasicInfoStepDto
  ) {
    return this.newSignupService.updateSignupStep(welcomeOrderId, {
      stepNumber: 1,
      stepName: 'Basic Info',
      stepData: basicInfoData,
      isCompleted: true,
      isValid: true,
    });
  }

  // Step 2 - Password
  @Put('welcome-order/:welcomeOrderId/step/password')
  @HttpCode(HttpStatus.OK)
  async updatePasswordStep(
    @Param('welcomeOrderId') welcomeOrderId: string,
    @Body() passwordData: PasswordStepDto
  ) {
    return this.newSignupService.updateSignupStep(welcomeOrderId, {
      stepNumber: 2,
      stepName: 'Password',
      stepData: passwordData,
      isCompleted: true,
      isValid: true,
    });
  }

  // Step 3 - Checkout
  @Put('welcome-order/:welcomeOrderId/step/checkout')
  @HttpCode(HttpStatus.OK)
  async updateCheckoutStep(
    @Param('welcomeOrderId') welcomeOrderId: string,
    @Body() checkoutData: CheckoutStepDto
  ) {
    return this.newSignupService.updateSignupStep(welcomeOrderId, {
      stepNumber: 3,
      stepName: 'Checkout',
      stepData: checkoutData,
      isCompleted: true,
      isValid: true,
    });
  }

  // Step 4 - Details (BMI + Medical + Consent)
  @Put('welcome-order/:welcomeOrderId/step/details')
  @HttpCode(HttpStatus.OK)
  async updateDetailsStep(
    @Param('welcomeOrderId') welcomeOrderId: string,
    @Body() detailsData: DetailsStepDto
  ) {
    return this.newSignupService.updateSignupStep(welcomeOrderId, {
      stepNumber: 4,
      stepName: 'Details',
      stepData: detailsData,
      isCompleted: true,
      isValid: true,
    });
  }

  // Sub-step endpoints for internal navigation

  // Step 1 - Basic Info Sub-steps
  @Put('welcome-order/:welcomeOrderId/step/basic-info/basic')
  @HttpCode(HttpStatus.OK)
  async updateBasicInfoBasicSubStep(
    @Param('welcomeOrderId') welcomeOrderId: string,
    @Body() basicData: { firstName: string; lastName: string; email: string }
  ) {
    return this.newSignupService.updateSignupStep(welcomeOrderId, {
      stepNumber: 1,
      stepName: 'Basic Info',
      subStepNumber: 0,
      subStepName: 'basic',
      stepData: basicData,
      isCompleted: false,
      isValid: true,
    });
  }

  @Put('welcome-order/:welcomeOrderId/step/basic-info/state')
  @HttpCode(HttpStatus.OK)
  async updateBasicInfoStateSubStep(
    @Param('welcomeOrderId') welcomeOrderId: string,
    @Body() stateData: { state: string }
  ) {
    return this.newSignupService.updateSignupStep(welcomeOrderId, {
      stepNumber: 1,
      stepName: 'Basic Info',
      subStepNumber: 1,
      subStepName: 'state',
      stepData: stateData,
      isCompleted: true,
      isValid: true,
    });
  }

  // Update User Profile
  @Put('update-user/:userId')
  @HttpCode(HttpStatus.OK)
  async updateUserProfile(
    @Param('userId') userId: string,
    @Body() userData: any
  ) {
    return this.newSignupService.updateUserProfile(userId, userData);
  }

  // Save BMI data to Medical Form
  @Post('save-bmi-data/:userId')
  @HttpCode(HttpStatus.OK)
  async saveBMIData(
    @Param('userId') userId: string,
    @Body() bmiData: { height: string; weight: string; waist: string; bmi: string }
  ) {
    return this.newSignupService.saveBMIData(userId, bmiData);
  }

  // Save Medical Intake Form data
  @Post('save-medical-intake/:userId')
  @HttpCode(HttpStatus.OK)
  async saveMedicalIntake(
    @Param('userId') userId: string,
    @Body() medicalData: any
  ) {
    return this.newSignupService.saveMedicalIntake(userId, medicalData);
  }

  // Save Consent data and send emails
  @Post('save-consent-and-complete/:userId')
  @HttpCode(HttpStatus.OK)
  async saveConsentAndComplete(
    @Param('userId') userId: string,
    @Body() consentData: any
  ) {
    return this.newSignupService.saveConsentAndComplete(userId, consentData);
  }

  // Step 4 - Details Sub-steps
  @Put('welcome-order/:welcomeOrderId/step/details/basicInfo')
  @HttpCode(HttpStatus.OK)
  async updateDetailsBasicInfoSubStep(
    @Param('welcomeOrderId') welcomeOrderId: string,
    @Body() basicInfoData: { 
      dateOfBirth: string; 
      completeAddress: string; 
      city: string; 
      zipcode: string; 
      primaryPhone: string; 
      alternativePhone: string; 
    }
  ) {
    return this.newSignupService.updateSignupStep(welcomeOrderId, {
      stepNumber: 4,
      stepName: 'Details',
      subStepNumber: 0,
      subStepName: 'basicInfo',
      stepData: basicInfoData,
      isCompleted: false,
      isValid: true,
    });
  }

  @Put('welcome-order/:welcomeOrderId/step/details/bmi')
  @HttpCode(HttpStatus.OK)
  async updateDetailsBMISubStep(
    @Param('welcomeOrderId') welcomeOrderId: string,
    @Body() bmiData: { height: string; weight: string; waist: string; bmi: string }
  ) {
    return this.newSignupService.updateSignupStep(welcomeOrderId, {
      stepNumber: 4,
      stepName: 'Details',
      subStepNumber: 1,
      subStepName: 'bmi',
      stepData: bmiData,
      isCompleted: false,
      isValid: true,
    });
  }

  @Put('welcome-order/:welcomeOrderId/step/details/medical')
  @HttpCode(HttpStatus.OK)
  async updateDetailsMedicalSubStep(
    @Param('welcomeOrderId') welcomeOrderId: string,
    @Body() medicalData: any
  ) {
    return this.newSignupService.updateSignupStep(welcomeOrderId, {
      stepNumber: 4,
      stepName: 'Details',
      subStepNumber: 1,
      subStepName: 'medical',
      stepData: medicalData,
      isCompleted: false,
      isValid: true,
    });
  }

  @Put('welcome-order/:welcomeOrderId/step/details/consent')
  @HttpCode(HttpStatus.OK)
  async updateDetailsConsentSubStep(
    @Param('welcomeOrderId') welcomeOrderId: string,
    @Body() consentData: {
      consentForTreatment: boolean;
      hipaaPrivacyNoticeAcknowledgment: boolean;
      releaseOfMedicalRecordsConsent: boolean;
    }
  ) {
    return this.newSignupService.updateSignupStep(welcomeOrderId, {
      stepNumber: 4,
      stepName: 'Details',
      subStepNumber: 2,
      subStepName: 'consent',
      stepData: consentData,
      isCompleted: true,
      isValid: true,
    });
  }

  // Create user step by step
  @Post('create-user-step-by-step')
  async createUserStepByStep(@Body() userData: CreateUserStepByStepDto) {
    const result = await this.newSignupService.createUserStepByStep(userData);
    return {
      success: true,
      statusCode: 201,
      message: 'User created successfully',
      data: result,
    };
  }

  // Update welcome order with user ID
  @Put('welcome-order/:welcomeOrderId')
  @HttpCode(HttpStatus.OK)
  async updateWelcomeOrder(
    @Param('welcomeOrderId') welcomeOrderId: string,
    @Body() updateData: { userId: string }
  ) {
    return this.newSignupService.updateWelcomeOrder(welcomeOrderId, updateData);
  }
}