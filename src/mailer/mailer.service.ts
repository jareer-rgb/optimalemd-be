import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService implements OnModuleInit {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Create transporter
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: true,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    // Verify connection
    try {
      await this.transporter.verify();
      console.log('Mailer service is ready');
    } catch (error) {
      console.error('Failed to initialize mailer service:', error);
    }
  }

  async sendEmailVerificationEmail(to: string, name: string, verificationLink: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background-color: #dc2626;
            padding: 25px;
            text-align: center;
          }
          .logo {
            color: #ffffff;
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0;
          }
          .content {
            padding: 30px;
            text-align: center;
          }
          .title {
            color: #333333;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .description {
            color: #666666;
            font-size: 16px;
            margin-bottom: 25px;
            line-height: 1.6;
          }
          .verification-button {
            display: inline-block;
            background-color: #dc2626;
            color: #ffffff !important;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
          }
          .info-box {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #dc2626;
          }
          .footer {
            background-color: #f8f9fa;
            text-align: center;
            padding: 20px;
            color: #666666;
            font-size: 14px;
            border-top: 1px solid #e9ecef;
          }
          .link-fallback {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border: 1px solid #e9ecef;
            color: #666666;
            font-size: 14px;
          }
          .link-fallback a {
            color: #dc2626;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">OptimaleMD</div>
          </div>
          <div class="content">
            <h2 class="title">Verify Your Email</h2>
            <p class="description">Hi ${name},</p>
            <p class="description">Please verify your email address to complete your registration.</p>
            
            <a href="${verificationLink}" class="verification-button">Verify Email</a>
            
            <div class="info-box">
              <p style="margin: 0; color: #dc2626; font-weight: bold;">⏰ This link expires in 1 hour</p>
            </div>
            
            <div class="link-fallback">
              <p style="margin: 0 0 10px 0;"><strong>Manual Link:</strong></p>
              <p style="margin: 0;">If the button doesn't work, copy this link:</p>
              <a href="${verificationLink}">${verificationLink}</a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} OptimaleMD</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"OptimaleMD" <${this.configService.get<string>('SMTP_FROM')}>`,
        to,
        subject: 'Verify Your Email - OptimaleMD',
        html,
      });
      console.log(`Email verification email sent successfully to ${to}`);
    } catch (error) {
      console.error('Failed to send email verification email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(to: string, name: string, resetLink: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background-color: #dc2626;
            padding: 25px;
            text-align: center;
          }
          .logo {
            color: #ffffff;
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0;
          }
          .content {
            padding: 30px;
            text-align: center;
          }
          .title {
            color: #333333;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .description {
            color: #666666;
            font-size: 16px;
            margin-bottom: 25px;
            line-height: 1.6;
          }
          .reset-button {
            display: inline-block;
            background-color: #dc2626;
            color: #ffffff !important;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
          }
          .info-box {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #dc2626;
          }
          .warning-box {
            background-color: #fff3cd;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
            color: #856404;
            font-size: 14px;
          }
          .footer {
            background-color: #f8f9fa;
            text-align: center;
            padding: 20px;
            color: #666666;
            font-size: 14px;
            border-top: 1px solid #e9ecef;
          }
          .link-fallback {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border: 1px solid #e9ecef;
            color: #666666;
            font-size: 14px;
          }
          .link-fallback a {
            color: #dc2626;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">OptimaleMD</div>
          </div>
          <div class="content">
            <h2 class="title">Reset Your Password</h2>
            <p class="description">Hi ${name},</p>
            <p class="description">We received a request to reset your password. Click the button below to create a new password.</p>
            
            <a href="${resetLink}" class="reset-button">Reset Password</a>
            
            <div class="info-box">
              <p style="margin: 0; color: #dc2626; font-weight: bold;">⏰ This link expires in 1 hour</p>
            </div>
            
            <div class="warning-box">
              <p style="margin: 0;"><strong>⚠️ Security Notice:</strong></p>
              <p style="margin: 5px 0 0 0;">If you didn't request this password reset, please ignore this email.</p>
            </div>
            
            <div class="link-fallback">
              <p style="margin: 0 0 10px 0;"><strong>Manual Link:</strong></p>
              <p style="margin: 0;">If the button doesn't work, copy this link:</p>
              <a href="${resetLink}">${resetLink}</a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} OptimaleMD</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"OptimaleMD" <${this.configService.get<string>('SMTP_FROM')}>`,
        to,
        subject: 'Reset Your Password - OptimaleMD',
        html,
      });
      console.log(`Password reset email sent successfully to ${to}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background-color: #dc2626;
            padding: 25px;
            text-align: center;
          }
          .logo {
            color: #ffffff;
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0;
          }
          .content {
            padding: 30px;
            text-align: center;
          }
          .title {
            color: #333333;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .description {
            color: #666666;
            font-size: 16px;
            margin-bottom: 25px;
            line-height: 1.6;
          }
          .welcome-message {
            background-color: #f8f9fa;
            padding: 25px;
            border-radius: 5px;
            margin: 25px 0;
            border-left: 4px solid #dc2626;
            color: #333333;
            font-size: 16px;
          }
          .welcome-icon {
            font-size: 32px;
            margin-bottom: 15px;
            display: block;
          }
          .footer {
            background-color: #f8f9fa;
            text-align: center;
            padding: 20px;
            color: #666666;
            font-size: 14px;
            border-top: 1px solid #e9ecef;
          }
          .cta-section {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin: 25px 0;
            border: 1px solid #e9ecef;
            color: #666666;
            font-size: 16px;
          }
          .cta-button {
            display: inline-block;
            background-color: #dc2626;
            color: #ffffff !important;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            font-size: 16px;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">OptimaleMD</div>
          </div>
          <div class="content">
            <h2 class="title">Welcome to OptimaleMD!</h2>
            <p class="description">Hi ${name},</p>
            <p class="description">Welcome to OptimaleMD! Your account has been successfully verified.</p>
            
            <div class="welcome-message">
              <span class="welcome-icon">🎉</span>
              <p style="margin: 0 0 10px 0; color: #dc2626; font-weight: bold; font-size: 18px;">Your account is now active!</p>
              <p style="margin: 0;">You can now access all features of OptimaleMD.</p>
            </div>
            
            <div class="cta-section">
              <p style="margin: 0 0 10px 0;"><strong>Ready to get started?</strong></p>
              <p style="margin: 0;">Log in to your account and explore our services.</p>
              <a href="${this.configService.get<string>('frontend.url')}/login" class="cta-button">Login Now</a>
            </div>
            
            <p class="description">Thank you for choosing OptimaleMD!</p>
          </div>
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} OptimaleMD</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"OptimaleMD" <${this.configService.get<string>('SMTP_FROM')}>`,
        to,
        subject: 'Welcome to OptimaleMD!',
        html,
      });
      console.log(`Welcome email sent successfully to ${to}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }
  }

  async sendAppointmentConfirmationEmail(
    patientEmail: string, 
    patientName: string, 
    doctorName: string, 
    serviceName: string, 
    appointmentDate: string, 
    appointmentTime: string,
    amount: string,
    googleMeetLink?: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background-color: #dc2626;
            padding: 25px;
            text-align: center;
          }
          .logo {
            color: #ffffff;
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0;
          }
          .content {
            padding: 30px;
            text-align: center;
          }
          .title {
            color: #333333;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .description {
            color: #666666;
            font-size: 16px;
            margin-bottom: 25px;
            line-height: 1.6;
          }
          .appointment-details {
            background-color: #f8f9fa;
            padding: 25px;
            border-radius: 5px;
            margin: 25px 0;
            border-left: 4px solid #28a745;
            text-align: left;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .detail-row:last-child {
            border-bottom: none;
            font-weight: bold;
            color: #dc2626;
            font-size: 18px;
          }
          .detail-label {
            font-weight: bold;
            color: #333333;
          }
          .detail-value {
            color: #666666;
          }
          .footer {
            background-color: #f8f9fa;
            text-align: center;
            padding: 20px;
            color: #666666;
            font-size: 14px;
            border-top: 1px solid #e9ecef;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">OptimaleMD</div>
          </div>
          <div class="content">
            <h2 class="title">Appointment Confirmed!</h2>
            <p class="description">Hi ${patientName},</p>
            <p class="description">Your appointment has been successfully confirmed. Here are the details:</p>
            
            <div class="appointment-details">
              <div class="detail-row">
                <span class="detail-label">Doctor:</span>
                <span class="detail-value">${doctorName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Service:</span>
                <span class="detail-value">${serviceName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${appointmentDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${appointmentTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount Paid:</span>
                <span class="detail-value">$${amount}</span>
              </div>
            </div>
            
            <p class="description">Please arrive 10 minutes before your scheduled time.</p>
            ${googleMeetLink ? `
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #28a745; margin-top: 0;">Video Consultation</h3>
              <p style="color: #333; margin-bottom: 15px;">This is a telemedicine appointment. Please use the Google Meet link below to join your video consultation:</p>
              <a href="${googleMeetLink}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0;">Join Google Meet</a>
              <p style="color: #666; font-size: 14px; margin-top: 10px;">Or copy this link: <span style="word-break: break-all;">${googleMeetLink}</span></p>
            </div>
            ` : ''}
            <p class="description">If you need to reschedule or cancel, please do so at least 1 hour before your appointment.</p>
          </div>
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} OptimaleMD</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"OptimaleMD" <${this.configService.get<string>('SMTP_FROM')}>`,
        to: patientEmail,
        subject: 'Appointment Confirmed - OptimaleMD',
        html,
      });
      console.log(`Appointment confirmation email sent successfully to ${patientEmail}`);
    } catch (error) {
      console.error('Failed to send appointment confirmation email:', error);
      throw error;
    }
  }

  async sendDoctorAppointmentNotification(
    doctorEmail: string,
    doctorName: string,
    patientName: string,
    serviceName: string,
    appointmentDate: string,
    appointmentTime: string,
    amount: string,
    googleMeetLink?: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background-color: #dc2626;
            padding: 25px;
            text-align: center;
          }
          .logo {
            color: #ffffff;
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0;
          }
          .content {
            padding: 30px;
            text-align: center;
          }
          .title {
            color: #333333;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .description {
            color: #666666;
            font-size: 16px;
            margin-bottom: 25px;
            line-height: 1.6;
          }
          .appointment-details {
            background-color: #f8f9fa;
            padding: 25px;
            border-radius: 5px;
            margin: 25px 0;
            border-left: 4px solid #007bff;
            text-align: left;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .detail-row:last-child {
            border-bottom: none;
            font-weight: bold;
            color: #28a745;
            font-size: 18px;
          }
          .detail-label {
            font-weight: bold;
            color: #333333;
          }
          .detail-value {
            color: #666666;
          }
          .footer {
            background-color: #f8f9fa;
            text-align: center;
            padding: 20px;
            color: #666666;
            font-size: 14px;
            border-top: 1px solid #e9ecef;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">OptimaleMD</div>
          </div>
          <div class="content">
            <h2 class="title">New Appointment Scheduled</h2>
            <p class="description">Hi Dr. ${doctorName},</p>
            <p class="description">A new appointment has been scheduled with you. Here are the details:</p>
            
            <div class="appointment-details">
              <div class="detail-row">
                <span class="detail-label">Patient:</span>
                <span class="detail-value">${patientName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Service:</span>
                <span class="detail-value">${serviceName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${appointmentDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${appointmentTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value">$${amount}</span>
              </div>
            </div>
            
            <p class="description">Please ensure you're available at the scheduled time.</p>
            ${googleMeetLink ? `
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #28a745; margin-top: 0;">Video Consultation</h3>
              <p style="color: #333; margin-bottom: 15px;">This is a telemedicine appointment. Please use the Google Meet link below to join your video consultation:</p>
              <a href="${googleMeetLink}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0;">Join Google Meet</a>
              <p style="color: #666; font-size: 14px; margin-top: 10px;">Or copy this link: <span style="word-break: break-all;">${googleMeetLink}</span></p>
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} OptimaleMD</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"OptimaleMD" <${this.configService.get<string>('SMTP_FROM')}>`,
        to: doctorEmail,
        subject: 'New Appointment Scheduled - OptimaleMD',
        html,
      });
      console.log(`Doctor appointment notification sent successfully to ${doctorEmail}`);
    } catch (error) {
      console.error('Failed to send doctor appointment notification:', error);
      throw error;
    }
  }

  async sendCancellationEmail(
    patientEmail: string,
    patientName: string,
    doctorName: string,
    appointmentDate: string,
    appointmentTime: string,
    amount: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background-color: #dc2626;
            padding: 25px;
            text-align: center;
          }
          .logo {
            color: #ffffff;
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0;
          }
          .content {
            padding: 30px;
            text-align: center;
          }
          .title {
            color: #333333;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .description {
            color: #666666;
            font-size: 16px;
            margin-bottom: 25px;
            line-height: 1.6;
          }
          .cancellation-details {
            background-color: #fff3cd;
            padding: 25px;
            border-radius: 5px;
            margin: 25px 0;
            border-left: 4px solid #ffc107;
            text-align: left;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .detail-row:last-child {
            border-bottom: none;
            font-weight: bold;
            color: #dc2626;
            font-size: 18px;
          }
          .detail-label {
            font-weight: bold;
            color: #333333;
          }
          .detail-value {
            color: #666666;
          }
          .refund-notice {
            background-color: #d4edda;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #28a745;
            color: #155724;
          }
          .footer {
            background-color: #f8f9fa;
            text-align: center;
            padding: 20px;
            color: #666666;
            font-size: 14px;
            border-top: 1px solid #e9ecef;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">OptimaleMD</div>
          </div>
          <div class="content">
            <h2 class="title">Appointment Cancelled</h2>
            <p class="description">Hi ${patientName},</p>
            <p class="description">Your appointment has been cancelled. Here are the details:</p>
            
            <div class="cancellation-details">
              <div class="detail-row">
                <span class="detail-label">Doctor:</span>
                <span class="detail-value">${doctorName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${appointmentDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${appointmentTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value">$${amount}</span>
              </div>
            </div>
            
            <div class="refund-notice">
              <p style="margin: 0;"><strong>Cancellation Policy:</strong></p>
              <p style="margin: 5px 0 0 0;">You may be charged $25 if you cancelled within less than 24 hours, or $50 if you missed your appointment. Please check with your doctor for any applicable charges.</p>
            </div>
            
            <p class="description">You can book a new appointment anytime through your dashboard.</p>
          </div>
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} OptimaleMD</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"OptimaleMD" <${this.configService.get<string>('SMTP_FROM')}>`,
        to: patientEmail,
        subject: 'Appointment Cancelled - OptimaleMD',
        html,
      });
      console.log(`Cancellation email sent successfully to ${patientEmail}`);
    } catch (error) {
      console.error('Failed to send cancellation email:', error);
      throw error;
    }
  }

  async sendDoctorCancellationNotification(
    doctorEmail: string,
    doctorName: string,
    patientName: string,
    patientEmail: string,
    appointmentDate: string,
    appointmentTime: string,
    amount: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background-color: #dc2626;
            padding: 25px;
            text-align: center;
          }
          .logo {
            color: #ffffff;
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0;
          }
          .content {
            padding: 30px;
            text-align: center;
          }
          .title {
            color: #333333;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .description {
            color: #666666;
            font-size: 16px;
            margin-bottom: 25px;
            line-height: 1.6;
          }
          .cancellation-details {
            background-color: #fff3cd;
            padding: 25px;
            border-radius: 5px;
            margin: 25px 0;
            border-left: 4px solid #ffc107;
            text-align: left;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .detail-row:last-child {
            border-bottom: none;
            font-weight: bold;
            color: #dc2626;
            font-size: 18px;
          }
          .detail-label {
            font-weight: bold;
            color: #333333;
          }
          .detail-value {
            color: #666666;
          }
          .refund-notice {
            background-color: #d4edda;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #28a745;
            color: #155724;
          }
          .footer {
            background-color: #f8f9fa;
            text-align: center;
            padding: 20px;
            color: #666666;
            font-size: 14px;
            border-top: 1px solid #e9ecef;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">OptimaleMD</div>
          </div>
          <div class="content">
            <h2 class="title">Appointment Cancelled</h2>
            <p class="description">Hi Dr. ${doctorName},</p>
            <p class="description">An appointment has been cancelled by the patient. Here are the details:</p>
            
            <div class="cancellation-details">
              <div class="detail-row">
                <span class="detail-label">Patient:</span>
                <span class="detail-value">${patientName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Patient Email:</span>
                <span class="detail-value">${patientEmail}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${appointmentDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${appointmentTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value">$${amount}</span>
              </div>
            </div>
            
            <div class="refund-notice">
              <p style="margin: 0;"><strong>Cancellation Policy:</strong></p>
              <p style="margin: 5px 0 0 0;">Please review if the patient should be charged $25 for cancelling within less than 24 hours, or $50 if they missed the appointment.</p>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} OptimaleMD</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"OptimaleMD" <${this.configService.get<string>('SMTP_FROM')}>`,
        to: doctorEmail,
        subject: 'Appointment Cancelled - OptimaleMD',
        html,
      });
      console.log(`Doctor cancellation notification sent successfully to ${doctorEmail}`);
    } catch (error) {
      console.error('Failed to send doctor cancellation notification:', error);
      throw error;
    }
  }

  async sendRescheduleEmail(
    patientEmail: string,
    patientName: string,
    doctorName: string,
    oldDate: string,
    oldTime: string,
    newDate: string,
    newTime: string,
    googleMeetLink?: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background-color: #dc2626;
            padding: 25px;
            text-align: center;
          }
          .logo {
            color: #ffffff;
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0;
          }
          .content {
            padding: 30px;
            text-align: center;
          }
          .title {
            color: #333333;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .description {
            color: #666666;
            font-size: 16px;
            margin-bottom: 25px;
            line-height: 1.6;
          }
          .reschedule-details {
            background-color: #e7f3ff;
            padding: 25px;
            border-radius: 5px;
            margin: 25px 0;
            border-left: 4px solid #007bff;
            text-align: left;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: bold;
            color: #333333;
          }
          .detail-value {
            color: #666666;
          }
          .old-appointment {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            border-left: 4px solid #ffc107;
          }
          .new-appointment {
            background-color: #d4edda;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            border-left: 4px solid #28a745;
          }
          .footer {
            background-color: #f8f9fa;
            text-align: center;
            padding: 20px;
            color: #666666;
            font-size: 14px;
            border-top: 1px solid #e9ecef;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">OptimaleMD</div>
          </div>
          <div class="content">
            <h2 class="title">Appointment Rescheduled</h2>
            <p class="description">Hi ${patientName},</p>
            <p class="description">Your appointment has been successfully rescheduled. Here are the details:</p>
            
            <div class="reschedule-details">
              <div class="detail-row">
                <span class="detail-label">Doctor:</span>
                <span class="detail-value">${doctorName}</span>
              </div>
              
              <div class="old-appointment">
                <div class="detail-row">
                  <span class="detail-label">Previous Date:</span>
                  <span class="detail-value">${oldDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Previous Time:</span>
                  <span class="detail-value">${oldTime}</span>
                </div>
              </div>
              
              <div class="new-appointment">
                <div class="detail-row">
                  <span class="detail-label">New Date:</span>
                  <span class="detail-value">${newDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">New Time:</span>
                  <span class="detail-value">${newTime}</span>
                </div>
              </div>
            </div>
            
            <p class="description">Please arrive 10 minutes before your new scheduled time.</p>
            ${googleMeetLink ? `
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #28a745; margin-top: 0;">Video Consultation</h3>
              <p style="color: #333; margin-bottom: 15px;">This is a telemedicine appointment. Please use the Google Meet link below to join your video consultation:</p>
              <a href="${googleMeetLink}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0;">Join Google Meet</a>
              <p style="color: #666; font-size: 14px; margin-top: 10px;">Or copy this link: <span style="word-break: break-all;">${googleMeetLink}</span></p>
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} OptimaleMD</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"OptimaleMD" <${this.configService.get<string>('SMTP_FROM')}>`,
        to: patientEmail,
        subject: 'Appointment Rescheduled - OptimaleMD',
        html,
      });
      console.log(`Reschedule email sent successfully to ${patientEmail}`);
    } catch (error) {
      console.error('Failed to send reschedule email:', error);
      throw error;
    }
  }

  async sendDoctorRescheduleNotification(
    doctorEmail: string,
    doctorName: string,
    patientName: string,
    oldDate: string,
    oldTime: string,
    newDate: string,
    newTime: string,
    googleMeetLink?: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background-color: #dc2626;
            padding: 25px;
            text-align: center;
          }
          .logo {
            color: #ffffff;
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0;
          }
          .content {
            padding: 30px;
            text-align: center;
          }
          .title {
            color: #333333;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .description {
            color: #666666;
            font-size: 16px;
            margin-bottom: 25px;
            line-height: 1.6;
          }
          .reschedule-details {
            background-color: #e7f3ff;
            padding: 25px;
            border-radius: 5px;
            margin: 25px 0;
            border-left: 4px solid #007bff;
            text-align: left;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: bold;
            color: #333333;
          }
          .detail-value {
            color: #666666;
          }
          .old-appointment {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            border-left: 4px solid #ffc107;
          }
          .new-appointment {
            background-color: #d4edda;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            border-left: 4px solid #28a745;
          }
          .footer {
            background-color: #f8f9fa;
            text-align: center;
            padding: 20px;
            color: #666666;
            font-size: 14px;
            border-top: 1px solid #e9ecef;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">OptimaleMD</div>
          </div>
          <div class="content">
            <h2 class="title">Appointment Rescheduled</h2>
            <p class="description">Hi Dr. ${doctorName},</p>
            <p class="description">An appointment has been rescheduled. Here are the details:</p>
            
            <div class="reschedule-details">
              <div class="detail-row">
                <span class="detail-label">Patient:</span>
                <span class="detail-value">${patientName}</span>
              </div>
              
              <div class="old-appointment">
                <div class="detail-row">
                  <span class="detail-label">Previous Date:</span>
                  <span class="detail-value">${oldDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Previous Time:</span>
                  <span class="detail-value">${oldTime}</span>
                </div>
              </div>
              
              <div class="new-appointment">
                <div class="detail-row">
                  <span class="detail-label">New Date:</span>
                  <span class="detail-value">${newDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">New Time:</span>
                  <span class="detail-value">${newTime}</span>
                </div>
              </div>
            </div>
            
            <p class="description">Please ensure you're available at the new scheduled time.</p>
            ${googleMeetLink ? `
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #28a745; margin-top: 0;">Video Consultation</h3>
              <p style="color: #333; margin-bottom: 15px;">This is a telemedicine appointment. Please use the Google Meet link below to join your video consultation:</p>
              <a href="${googleMeetLink}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0;">Join Google Meet</a>
              <p style="color: #666; font-size: 14px; margin-top: 10px;">Or copy this link: <span style="word-break: break-all;">${googleMeetLink}</span></p>
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} OptimaleMD</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"OptimaleMD" <${this.configService.get<string>('SMTP_FROM')}>`,
        to: doctorEmail,
        subject: 'Appointment Rescheduled - OptimaleMD',
        html,
      });
      console.log(`Doctor reschedule notification sent successfully to ${doctorEmail}`);
    } catch (error) {
      console.error('Failed to send doctor reschedule notification:', error);
      throw error;
    }
  }
} 