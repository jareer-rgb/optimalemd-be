import { Controller, Get, Post, Query, Body, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { GoogleCalendarOAuthService } from './google-calendar-oauth.service';

@ApiTags('Google Calendar OAuth')
@Controller('google-calendar/oauth')
export class GoogleCalendarOAuthController {
  constructor(private oauthService: GoogleCalendarOAuthService) {}

  @Get('auth-url')
  @ApiOperation({
    summary: 'Get Google Calendar OAuth authorization URL',
    description: 'Generate OAuth URL for doctor to connect their Google Calendar'
  })
  @ApiQuery({ name: 'doctorId', description: 'Doctor ID', required: true })
  @ApiResponse({ status: 200, description: 'Authorization URL generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid doctor ID' })
  async getAuthUrl(@Query('doctorId') doctorId: string) {
    if (!doctorId) {
      throw new Error('Doctor ID is required');
    }

    const authUrl = this.oauthService.generateAuthUrl(doctorId);
    return {
      success: true,
      authUrl,
      message: 'Please visit the authorization URL to connect your Google Calendar'
    };
  }

  @Get('callback')
  @ApiOperation({
    summary: 'Handle Google Calendar OAuth callback',
    description: 'Process OAuth callback and exchange code for tokens'
  })
  @ApiQuery({ name: 'code', description: 'Authorization code from Google', required: true })
  @ApiQuery({ name: 'state', description: 'State parameter containing doctor ID', required: true })
  @ApiResponse({ status: 200, description: 'OAuth callback processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid authorization code or state' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response
  ) {
    try {
      const result = await this.oauthService.exchangeCodeForTokens(code, state);
      
      if (result.success) {
        // Redirect to success page
        res.redirect(`https://optimalemd.health/doctor-dashboard?calendar=connected&doctorId=${result.doctorId}`);
      } else {
        // Redirect to error page
        res.redirect(`https://optimalemd.health/doctor-dashboard?calendar=error&error=${encodeURIComponent(result.error || 'Unknown error')}`);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`https://optimalemd.health/doctor-dashboard?calendar=error&error=${encodeURIComponent(error.message)}`);
    }
  }

  @Post('disconnect')
  @ApiOperation({
    summary: 'Disconnect doctor from Google Calendar',
    description: 'Remove Google Calendar connection for a doctor'
  })
  @ApiResponse({ status: 200, description: 'Doctor disconnected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid doctor ID' })
  async disconnectDoctor(@Body() body: { doctorId: string }) {
    const { doctorId } = body;
    
    if (!doctorId) {
      throw new Error('Doctor ID is required');
    }

    const result = await this.oauthService.disconnectDoctor(doctorId);
    
    return {
      success: result.success,
      message: result.success ? 'Google Calendar disconnected successfully' : 'Failed to disconnect Google Calendar',
      error: result.error
    };
  }

  @Get('status')
  @ApiOperation({
    summary: 'Check Google Calendar connection status',
    description: 'Check if a doctor is connected to Google Calendar'
  })
  @ApiQuery({ name: 'doctorId', description: 'Doctor ID', required: true })
  @ApiResponse({ status: 200, description: 'Connection status retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid doctor ID' })
  async getConnectionStatus(@Query('doctorId') doctorId: string) {
    if (!doctorId) {
      throw new Error('Doctor ID is required');
    }

    const isConnected = await this.oauthService.isDoctorConnected(doctorId);
    
    return {
      success: true,
      isConnected,
      message: isConnected ? 'Google Calendar is connected' : 'Google Calendar is not connected'
    };
  }

  @Post('fix-calendar-id')
  @ApiOperation({
    summary: 'Fix calendar ID for a specific doctor (admin function)',
    description: 'Correct the calendar ID for a doctor who might have wrong calendar assigned'
  })
  @ApiResponse({ status: 200, description: 'Calendar ID fixed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid doctor ID' })
  async fixDoctorCalendarId(@Body('doctorId') doctorId: string) {
    if (!doctorId) {
      throw new Error('Doctor ID is required');
    }

    const result = await this.oauthService.fixDoctorCalendarId(doctorId);
    return {
      success: result.success,
      message: result.message,
      error: result.error
    };
  }

  @Post('fix-all-calendar-ids')
  @ApiOperation({
    summary: 'Fix calendar IDs for all connected doctors (admin function)',
    description: 'Correct calendar IDs for all doctors who might have wrong calendars assigned'
  })
  @ApiResponse({ status: 200, description: 'All calendar IDs fixed successfully' })
  async fixAllDoctorsCalendarIds() {
    const result = await this.oauthService.fixAllDoctorsCalendarIds();
    return {
      success: result.success,
      message: `Fixed calendar IDs for ${result.fixed} doctors`,
      fixed: result.fixed,
      errors: result.errors
    };
  }
}
