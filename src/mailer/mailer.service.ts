import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private appointmentTransporter: nodemailer.Transporter;
  private isNoopTransport = false;
  private isAppointmentNoopTransport = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Initialize default transporter
    await this.initializeDefaultTransporter();
    
    // Initialize appointment-specific transporter
    await this.initializeAppointmentTransporter();
  }

  private async initializeDefaultTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!user || !pass) {
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      } as any);
      this.isNoopTransport = true;
      console.warn('Default mailer running in no-op mode: missing SMTP_USER/SMTP_PASS');
      return;
    }

    const useSecure = Number(port) === 465;
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: host || 'smtp.gmail.com',
      port: Number(port) || 587,
      secure: useSecure,
      auth: { user, pass },
    });

    try {
      await this.transporter.verify();
      console.log('Default mailer service is ready');
    } catch (error) {
      console.error('Failed to initialize default SMTP transport, falling back to no-op transport:', error);
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      } as any);
      this.isNoopTransport = true;
    }
  }

  private async initializeAppointmentTransporter() {
    const host = this.configService.get<string>('APPOINTMENT_SMTP_HOST');
    const port = this.configService.get<number>('APPOINTMENT_SMTP_PORT');
    const user = this.configService.get<string>('APPOINTMENT_SMTP_USER');
    const pass = this.configService.get<string>('APPOINTMENT_SMTP_PASS');

    // If appointment-specific config is not provided, use default transporter
    if (!user || !pass) {
      console.log('Appointment email config not found, using default transporter');
      this.appointmentTransporter = this.transporter;
      this.isAppointmentNoopTransport = this.isNoopTransport;
      return;
    }

    const useSecure = Number(port) === 465;
    this.appointmentTransporter = nodemailer.createTransport({
      service: 'gmail',
      host: host || 'smtp.gmail.com',
      port: Number(port) || 587,
      secure: useSecure,
      auth: { user, pass },
    });

    try {
      await this.appointmentTransporter.verify();
      console.log('Appointment mailer service is ready');
    } catch (error) {
      console.error('Failed to initialize appointment SMTP transport, falling back to default:', error);
      this.appointmentTransporter = this.transporter;
      this.isAppointmentNoopTransport = this.isNoopTransport;
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"OptimaleMD" <${this.configService.get<string>('SMTP_FROM')}>`,
        to,
        subject,
        text,
        html,
      });
      const note = this.isNoopTransport ? '(no-op transport)' : '';
      console.log(`Email sent successfully to ${to} ${note}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendEmailWithAttachment(
    to: string,
    subject: string,
    text: string,
    attachments: Array<{ filename: string; path: string; contentType?: string }>,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"OptimaleMD" <${this.configService.get<string>('SMTP_FROM')}>`,
        to,
        subject,
        text,
        attachments,
      });
      const note = this.isNoopTransport ? '(no-op transport)' : '';
      console.log(`Email with attachment sent successfully to ${to} ${note}`);
    } catch (error) {
      console.error('Failed to send email with attachment:', error);
      throw error;
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
            background-color: #000000;
            padding: 25px;
            text-align: center;
          }
          .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 0 auto;
            width: fit-content;
          }
          .logo-img {
            width: 40px;
            height: 40px;
            object-fit: contain;
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
            background-color: #000000;
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
            border-left: 4px solid #000000;
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
            color: #000000;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-container">
              <img src="https://optimalemd.health/logo.png" alt="OptimaleMD Logo" class="logo-img" />
              <div class="logo">OptimaleMD</div>
            </div>
          </div>
          <div class="content">
            <h2 class="title">Verify Your Email</h2>
            <p class="description">Hi ${name},</p>
            <p class="description">Please verify your email address to complete your registration.</p>
            
            <a href="${verificationLink}" class="verification-button">Verify Email</a>
            
            <div class="info-box">
              <p style="margin: 0; color: #000000; font-weight: bold;">⏰ This link expires in 1 hour</p>
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
            background-color: #000000;
            padding: 25px;
            text-align: center;
          }
          .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 0 auto;
            width: fit-content;
          }
          .logo-img {
            width: 40px;
            height: 40px;
            object-fit: contain;
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
            background-color: #000000;
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
            border-left: 4px solid #000000;
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
            color: #000000;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-container">
              <img src="https://optimalemd.health/logo.png" alt="OptimaleMD Logo" class="logo-img" />
              <div class="logo">OptimaleMD</div>
            </div>
          </div>
          <div class="content">
            <h2 class="title">Reset Your Password</h2>
            <p class="description">Hi ${name},</p>
            <p class="description">We received a request to reset your password. Click the button below to create a new password.</p>
            
            <a href="${resetLink}" class="reset-button">Reset Password</a>
            
            <div class="info-box">
              <p style="margin: 0; color: #000000; font-weight: bold;">⏰ This link expires in 1 hour</p>
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
            background-color: #000000;
            padding: 25px;
            text-align: center;
          }
          .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 0 auto;
            width: fit-content;
          }
          .logo-img {
            width: 40px;
            height: 40px;
            object-fit: contain;
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
            border-left: 4px solid #000000;
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
            background-color: #000000;
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
            <div class="logo-container">
              <img src="https://optimalemd.health/logo.png" alt="OptimaleMD Logo" class="logo-img" />
              <div class="logo">OptimaleMD</div>
            </div>
          </div>
          <div class="content">
            <h2 class="title">Welcome to OptimaleMD!</h2>
            <p class="description">Hi ${name},</p>
            <p class="description">Welcome to OptimaleMD! Your account has been successfully verified.</p>
            
            <div class="welcome-message">
              <span class="welcome-icon">🎉</span>
              <p style="margin: 0 0 10px 0; color: #000000; font-weight: bold; font-size: 18px;">Your account is now active!</p>
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
    googleMeetLink?: string,
    timezone?: string // Optional IANA timezone (e.g., "America/New_York", "Europe/London"). Defaults to UTC if not provided.
  ): Promise<void> {
    // Convert UTC time to specified timezone (or UTC if not provided)
    const [hours, minutes] = appointmentTime.split(':').map(Number);
    const [year, month, day] = appointmentDate.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    
    // Use Intl.DateTimeFormat to convert to specified timezone (or UTC)
    const targetTimezone = timezone || 'UTC';
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Format time in target timezone
    const formattedTime = timeFormatter.format(utcDate);
    // Extract hour and minute from formatted string (e.g., "08:00 AM" or "8:00 AM")
    const timeMatch = formattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    const displayTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3]}` : formattedTime;
    
    // Add timezone indicator
    const timezoneAbbr = this.getTimezoneAbbreviation(targetTimezone, utcDate);
    const localTime = `${displayTime} ${timezoneAbbr ? `(${timezoneAbbr})` : '(UTC)'}`;
    
    // Format date in target timezone
    const localDate = dateFormatter.format(utcDate);
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
            background-color: #000000;
            padding: 25px;
            text-align: center;
          }
          .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 0 auto;
            width: fit-content;
          }
          .logo-img {
            width: 40px;
            height: 40px;
            object-fit: contain;
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
            color: #000000;
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
            <div class="logo-container">
              <img src="https://optimalemd.health/logo.png" alt="OptimaleMD Logo" class="logo-img" />
              <div class="logo">OptimaleMD</div>
            </div>
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
                <span class="detail-value">${localDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${localTime}</span>
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
      const fromEmail = this.configService.get<string>('APPOINTMENT_SMTP_FROM') || this.configService.get<string>('SMTP_FROM');
      await this.appointmentTransporter.sendMail({
        from: `"OptimaleMD" <${fromEmail}>`,
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
    googleMeetLink?: string,
    timezone?: string // Optional IANA timezone (e.g., "America/New_York"). Defaults to UTC if not provided.
  ): Promise<void> {
    // Convert UTC time to specified timezone (or UTC if not provided)
    const [hours, minutes] = appointmentTime.split(':').map(Number);
    const [year, month, day] = appointmentDate.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    
    // Use Intl.DateTimeFormat to convert to specified timezone (or UTC)
    const targetTimezone = timezone || 'UTC';
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Format time in target timezone
    const formattedTime = timeFormatter.format(utcDate);
    // Extract hour and minute from formatted string (e.g., "08:00 AM" or "8:00 AM")
    const timeMatch = formattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    const displayTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3]}` : formattedTime;
    
    // Add timezone indicator
    const timezoneAbbr = this.getTimezoneAbbreviation(targetTimezone, utcDate);
    const localTime = `${displayTime} ${timezoneAbbr ? `(${timezoneAbbr})` : '(UTC)'}`;
    
    // Format date in target timezone
    const localDate = dateFormatter.format(utcDate);
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
            background-color: #000000;
            padding: 25px;
            text-align: center;
          }
          .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 0 auto;
            width: fit-content;
          }
          .logo-img {
            width: 40px;
            height: 40px;
            object-fit: contain;
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
            <div class="logo-container">
              <img src="https://optimalemd.health/logo.png" alt="OptimaleMD Logo" class="logo-img" />
              <div class="logo">OptimaleMD</div>
            </div>
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
                <span class="detail-value">${localDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${localTime}</span>
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
      const fromEmail = this.configService.get<string>('APPOINTMENT_SMTP_FROM') || this.configService.get<string>('SMTP_FROM');
      await this.appointmentTransporter.sendMail({
        from: `"OptimaleMD" <${fromEmail}>`,
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
            background-color: #000000;
            padding: 25px;
            text-align: center;
          }
          .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 0 auto;
            width: fit-content;
          }
          .logo-img {
            width: 40px;
            height: 40px;
            object-fit: contain;
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
            color: #000000;
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
            <div class="logo-container">
              <img src="https://optimalemd.health/logo.png" alt="OptimaleMD Logo" class="logo-img" />
              <div class="logo">OptimaleMD</div>
            </div>
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
      const fromEmail = this.configService.get<string>('APPOINTMENT_SMTP_FROM') || this.configService.get<string>('SMTP_FROM');
      await this.appointmentTransporter.sendMail({
        from: `"OptimaleMD" <${fromEmail}>`,
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
            background-color: #000000;
            padding: 25px;
            text-align: center;
          }
          .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 0 auto;
            width: fit-content;
          }
          .logo-img {
            width: 40px;
            height: 40px;
            object-fit: contain;
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
            color: #000000;
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
            <div class="logo-container">
              <img src="https://optimalemd.health/logo.png" alt="OptimaleMD Logo" class="logo-img" />
              <div class="logo">OptimaleMD</div>
            </div>
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
      const fromEmail = this.configService.get<string>('APPOINTMENT_SMTP_FROM') || this.configService.get<string>('SMTP_FROM');
      await this.appointmentTransporter.sendMail({
        from: `"OptimaleMD" <${fromEmail}>`,
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
    googleMeetLink?: string,
    timezone?: string // Optional IANA timezone. Defaults to UTC if not provided.
  ): Promise<void> {
    // Convert UTC times to specified timezone (or UTC if not provided)
    const targetTimezone = timezone || 'UTC';
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Convert old appointment time
    const [oldHours, oldMinutes] = oldTime.split(':').map(Number);
    const [oldYear, oldMonth, oldDay] = oldDate.split('-').map(Number);
    const oldUtcDate = new Date(Date.UTC(oldYear, oldMonth - 1, oldDay, oldHours, oldMinutes, 0));
    const oldFormattedTime = timeFormatter.format(oldUtcDate);
    const oldTimeMatch = oldFormattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    const oldDisplayTime = oldTimeMatch ? `${oldTimeMatch[1]}:${oldTimeMatch[2]} ${oldTimeMatch[3]}` : oldFormattedTime;
    const oldTimezoneAbbr = this.getTimezoneAbbreviation(targetTimezone, oldUtcDate);
    const oldLocalTime = `${oldDisplayTime} ${oldTimezoneAbbr ? `(${oldTimezoneAbbr})` : '(UTC)'}`;
    const oldLocalDate = dateFormatter.format(oldUtcDate);

    // Convert new appointment time
    const [newHours, newMinutes] = newTime.split(':').map(Number);
    const [newYear, newMonth, newDay] = newDate.split('-').map(Number);
    const newUtcDate = new Date(Date.UTC(newYear, newMonth - 1, newDay, newHours, newMinutes, 0));
    const newFormattedTime = timeFormatter.format(newUtcDate);
    const newTimeMatch = newFormattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    const newDisplayTime = newTimeMatch ? `${newTimeMatch[1]}:${newTimeMatch[2]} ${newTimeMatch[3]}` : newFormattedTime;
    const newTimezoneAbbr = this.getTimezoneAbbreviation(targetTimezone, newUtcDate);
    const newLocalTime = `${newDisplayTime} ${newTimezoneAbbr ? `(${newTimezoneAbbr})` : '(UTC)'}`;
    const newLocalDate = dateFormatter.format(newUtcDate);

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
            background-color: #000000;
            padding: 25px;
            text-align: center;
          }
          .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 0 auto;
            width: fit-content;
          }
          .logo-img {
            width: 40px;
            height: 40px;
            object-fit: contain;
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
            <div class="logo-container">
              <img src="https://optimalemd.health/logo.png" alt="OptimaleMD Logo" class="logo-img" />
              <div class="logo">OptimaleMD</div>
            </div>
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
                  <span class="detail-value">${oldLocalDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Previous Time:</span>
                  <span class="detail-value">${oldLocalTime}</span>
                </div>
              </div>
              
              <div class="new-appointment">
                <div class="detail-row">
                  <span class="detail-label">New Date:</span>
                  <span class="detail-value">${newLocalDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">New Time:</span>
                  <span class="detail-value">${newLocalTime}</span>
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
      const fromEmail = this.configService.get<string>('APPOINTMENT_SMTP_FROM') || this.configService.get<string>('SMTP_FROM');
      await this.appointmentTransporter.sendMail({
        from: `"OptimaleMD" <${fromEmail}>`,
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
    googleMeetLink?: string,
    timezone?: string // Optional IANA timezone. Defaults to UTC if not provided.
  ): Promise<void> {
    // Convert UTC times to specified timezone (or UTC if not provided)
    const targetTimezone = timezone || 'UTC';
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Convert old appointment time
    const [oldHours, oldMinutes] = oldTime.split(':').map(Number);
    const [oldYear, oldMonth, oldDay] = oldDate.split('-').map(Number);
    const oldUtcDate = new Date(Date.UTC(oldYear, oldMonth - 1, oldDay, oldHours, oldMinutes, 0));
    const oldFormattedTime = timeFormatter.format(oldUtcDate);
    const oldTimeMatch = oldFormattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    const oldDisplayTime = oldTimeMatch ? `${oldTimeMatch[1]}:${oldTimeMatch[2]} ${oldTimeMatch[3]}` : oldFormattedTime;
    const oldTimezoneAbbr = this.getTimezoneAbbreviation(targetTimezone, oldUtcDate);
    const oldLocalTime = `${oldDisplayTime} ${oldTimezoneAbbr ? `(${oldTimezoneAbbr})` : '(UTC)'}`;
    const oldLocalDate = dateFormatter.format(oldUtcDate);

    // Convert new appointment time
    const [newHours, newMinutes] = newTime.split(':').map(Number);
    const [newYear, newMonth, newDay] = newDate.split('-').map(Number);
    const newUtcDate = new Date(Date.UTC(newYear, newMonth - 1, newDay, newHours, newMinutes, 0));
    const newFormattedTime = timeFormatter.format(newUtcDate);
    const newTimeMatch = newFormattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    const newDisplayTime = newTimeMatch ? `${newTimeMatch[1]}:${newTimeMatch[2]} ${newTimeMatch[3]}` : newFormattedTime;
    const newTimezoneAbbr = this.getTimezoneAbbreviation(targetTimezone, newUtcDate);
    const newLocalTime = `${newDisplayTime} ${newTimezoneAbbr ? `(${newTimezoneAbbr})` : '(UTC)'}`;
    const newLocalDate = dateFormatter.format(newUtcDate);

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
            background-color: #000000;
            padding: 25px;
            text-align: center;
          }
          .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 0 auto;
            width: fit-content;
          }
          .logo-img {
            width: 40px;
            height: 40px;
            object-fit: contain;
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
            <div class="logo-container">
              <img src="https://optimalemd.health/logo.png" alt="OptimaleMD Logo" class="logo-img" />
              <div class="logo">OptimaleMD</div>
            </div>
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
                  <span class="detail-value">${oldLocalDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Previous Time:</span>
                  <span class="detail-value">${oldLocalTime}</span>
                </div>
              </div>
              
              <div class="new-appointment">
                <div class="detail-row">
                  <span class="detail-label">New Date:</span>
                  <span class="detail-value">${newLocalDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">New Time:</span>
                  <span class="detail-value">${newLocalTime}</span>
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
      const fromEmail = this.configService.get<string>('APPOINTMENT_SMTP_FROM') || this.configService.get<string>('SMTP_FROM');
      await this.appointmentTransporter.sendMail({
        from: `"OptimaleMD" <${fromEmail}>`,
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

  async sendMedicalFormEmail(to: string, name: string, formLink: string): Promise<void> {
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
            background-color: #000000;
            padding: 25px;
            text-align: center;
          }
          .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 0 auto;
            width: fit-content;
          }
          .logo-img {
            width: 40px;
            height: 40px;
            object-fit: contain;
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
          .form-button {
            display: inline-block;
            background-color: #000000;
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
            border-left: 4px solid #000000;
            text-align: left;
          }
          .important-notice {
            background-color: #fff3cd;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
            color: #856404;
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
            color: #000000;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-container">
              <img src="https://optimalemd.health/logo.png" alt="OptimaleMD Logo" class="logo-img" />
              <div class="logo">OptimaleMD</div>
            </div>
          </div>
          <div class="content">
            <h2 class="title">Complete Your Medical Consultation Form</h2>
            <p class="description">Hi ${name},</p>
            <p class="description">Welcome to OptimaleMD! To ensure we can provide you with the best possible care, please complete your medical consultation form.</p>
            
            <a href="${formLink}" class="form-button">Complete Medical Form</a>
            
            <div class="info-box">
              <p style="margin: 0 0 10px 0; color: #000000; font-weight: bold;">📋 Required Information</p>
              <p style="margin: 0;">This form includes your medical history, current medications, allergies, and other important health information that will help our doctors provide better care.</p>
            </div>
            
            <div class="important-notice">
              <p style="margin: 0;"><strong>⚠️ Important:</strong></p>
              <p style="margin: 5px 0 0 0;">You must complete this form before you can book any appointments. This ensures our doctors have all the necessary information to provide you with the best care.</p>
            </div>
            
            <div class="link-fallback">
              <p style="margin: 0 0 10px 0;"><strong>Manual Link:</strong></p>
              <p style="margin: 0;">If the button doesn't work, copy this link:</p>
              <a href="${formLink}">${formLink}</a>
            </div>
            
            <p class="description">Thank you for choosing OptimaleMD for your healthcare needs!</p>
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
        subject: 'Complete Your Medical Consultation Form - OptimaleMD',
        html,
      });
      console.log(`Medical form email sent successfully to ${to}`);
    } catch (error) {
      console.error('Failed to send medical form email:', error);
      throw error;
    }
  }

  async sendAdminCreatedPatientEmail(to: string, name: string, password: string, verificationLink: string): Promise<void> {
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
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #000000, #b91c1c);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          }
          .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
          }
          .content h2 {
            color: #000000;
            font-size: 24px;
            margin-bottom: 20px;
            font-weight: 600;
          }
          .content p {
            font-size: 16px;
            margin-bottom: 20px;
            color: #555555;
          }
          .credentials-box {
            background-color: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
          }
          .credentials-box h3 {
            color: #000000;
            margin: 0 0 15px 0;
            font-size: 18px;
          }
          .credential-item {
            background-color: #ffffff;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 12px;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            word-break: break-all;
          }
          .credential-label {
            font-weight: bold;
            color: #495057;
            display: block;
            margin-bottom: 5px;
            font-family: Arial, sans-serif;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #000000, #b91c1c);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            transition: all 0.3s ease;
          }
          .button:hover {
            background: linear-gradient(135deg, #b91c1c, #991b1b);
            transform: translateY(-2px);
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 14px;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 30px 20px;
            text-align: center;
            color: #666666;
            font-size: 14px;
            border-top: 1px solid #e9ecef;
          }
          .footer p {
            margin: 5px 0;
          }
          .logo {
            font-size: 32px;
            font-weight: 800;
            margin-bottom: 10px;
          }
          @media (max-width: 600px) {
            body {
              padding: 10px;
            }
            .content {
              padding: 30px 20px;
            }
            .header {
              padding: 25px 15px;
            }
            .header h1 {
              font-size: 24px;
            }
            .button {
              padding: 12px 25px;
              font-size: 14px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">OptimalMD</div>
            <h1>Welcome to OptimalMD!</h1>
            <p>Your account has been created by our admin team</p>
          </div>
          
          <div class="content">
            <h2>Hello ${name}!</h2>
            
            <p>Great news! Your OptimalMD patient account has been successfully created by our administrative team. You can now access our platform to manage your healthcare journey.</p>
            
            <div class="credentials-box">
              <h3>🔐 Your Login Credentials</h3>
              <div class="credential-item">
                <span class="credential-label">Email Address:</span>
                ${to}
              </div>
              <div class="credential-item">
                <span class="credential-label">Temporary Password:</span>
                ${password}
              </div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important Security Notice:</strong><br>
              For your security, please change your password after your first login. This temporary password should only be used for initial access.
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ol style="color: #555555; font-size: 16px; line-height: 1.8;">
              <li>Click the verification button below to verify your email address</li>
              <li>Log in to your account using the credentials above</li>
              <li>Change your password in your account settings</li>
              <li>Complete your medical intake form</li>
              <li>Schedule your first appointment</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" class="button">
                ✅ Verify Email & Get Started
              </a>
            </div>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team. We're here to help you every step of the way!</p>
            
            <p style="margin-top: 30px;">
              <strong>The OptimalMD Team</strong><br>
              <em>Optimizing your health, one step at a time</em>
            </p>
          </div>
          
          <div class="footer">
            <p><strong>OptimalMD</strong></p>
            <p>This email was sent because an account was created for you by our admin team.</p>
            <p>If you believe this was sent in error, please contact our support team immediately.</p>
            <p style="margin-top: 20px; font-size: 12px; color: #999999;">
              © 2024 OptimalMD. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"OptimalMD" <${this.configService.get<string>('SMTP_USER')}>`,
      to,
      subject: '🎉 Welcome to OptimalMD - Your Account is Ready!',
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Admin-created patient welcome email sent successfully to ${to}`);
    } catch (error) {
      console.error('Failed to send admin-created patient welcome email:', error);
      throw error;
    }
  }

  async sendSubscriptionConfirmationEmail(to: string, name: string, subscriptionStartDate: Date, subscriptionEndDate: Date, monthlyAmount: number): Promise<void> {
    const formattedStartDate = subscriptionStartDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedEndDate = subscriptionEndDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

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
            background-color: #000000;
            padding: 25px;
            text-align: center;
          }
          .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 0 auto;
            width: fit-content;
          }
          .logo-img {
            width: 40px;
            height: 40px;
            object-fit: contain;
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
          .success-message {
            background-color: #d4edda;
            padding: 25px;
            border-radius: 5px;
            margin: 25px 0;
            border-left: 4px solid #28a745;
            color: #155724;
          }
          .subscription-details {
            background-color: #f8f9fa;
            padding: 25px;
            border-radius: 5px;
            margin: 25px 0;
            border-left: 4px solid #000000;
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
            color: #000000;
            font-size: 18px;
          }
          .detail-label {
            font-weight: bold;
            color: #333333;
          }
          .detail-value {
            color: #666666;
          }
          .info-box {
            background-color: #e7f3ff;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
            color: #004085;
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-container">
              <img src="https://optimalemd.health/logo.png" alt="OptimaleMD Logo" class="logo-img" />
              <div class="logo">OptimaleMD</div>
            </div>
          </div>
          <div class="content">
            <h2 class="title">Subscription Confirmed!</h2>
            <p class="description">Hi ${name},</p>
            <p class="description">Thank you for subscribing to OptimaleMD! Your subscription has been successfully activated.</p>
            
            <div class="success-message">
              <span style="font-size: 32px; display: block; margin-bottom: 10px;">🎉</span>
              <p style="margin: 0; color: #155724; font-weight: bold; font-size: 18px;">Your subscription is now active!</p>
            </div>
            
            <div class="subscription-details">
              <div class="detail-row">
                <span class="detail-label">Subscription Period:</span>
                <span class="detail-value">${formattedStartDate} - ${formattedEndDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Monthly Cost:</span>
                <span class="detail-value">$${monthlyAmount.toFixed(2)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Billing Cycle:</span>
                <span class="detail-value">Monthly</span>
              </div>
            </div>
            
            <div class="info-box">
              <p style="margin: 0;"><strong>ℹ️ Important Information:</strong></p>
              <ul style="text-align: left; margin: 10px 0 0 20px; padding: 0;">
                <li>Your subscription will automatically renew each month</li>
                <li>You can manage or cancel your subscription anytime from your account settings</li>
                <li>You'll receive email notifications for each renewal</li>
              </ul>
            </div>
            
            <p class="description">You now have access to all premium features and benefits. We're excited to help you on your health journey!</p>
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
        subject: 'Subscription Confirmed - OptimaleMD',
        html,
      });
      console.log(`Subscription confirmation email sent successfully to ${to}`);
    } catch (error) {
      console.error('Failed to send subscription confirmation email:', error);
      throw error;
    }
  }

  async sendSubscriptionCancellationEmail(to: string, name: string, subscriptionEndDate: Date, monthlyAmount: number): Promise<void> {
    const formattedEndDate = subscriptionEndDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

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
            background-color: #000000;
            padding: 25px;
            text-align: center;
          }
          .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 0 auto;
            width: fit-content;
          }
          .logo-img {
            width: 40px;
            height: 40px;
            object-fit: contain;
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
          .cancellation-message {
            background-color: #fff3cd;
            padding: 25px;
            border-radius: 5px;
            margin: 25px 0;
            border-left: 4px solid #ffc107;
            color: #856404;
          }
          .subscription-details {
            background-color: #f8f9fa;
            padding: 25px;
            border-radius: 5px;
            margin: 25px 0;
            border-left: 4px solid #000000;
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
          .info-box {
            background-color: #e7f3ff;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
            color: #004085;
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-container">
              <img src="https://optimalemd.health/logo.png" alt="OptimaleMD Logo" class="logo-img" />
              <div class="logo">OptimaleMD</div>
            </div>
          </div>
          <div class="content">
            <h2 class="title">Subscription Cancellation Request</h2>
            <p class="description">Hi ${name},</p>
            <p class="description">We've received your request to cancel your recurring subscription payment.</p>
            
            <div class="cancellation-message">
              <span style="font-size: 32px; display: block; margin-bottom: 10px;">⚠️</span>
              <p style="margin: 0; color: #856404; font-weight: bold; font-size: 18px;">Your subscription will remain active until the end of your current billing period.</p>
            </div>
            
            <div class="subscription-details">
              <div class="detail-row">
                <span class="detail-label">Subscription End Date:</span>
                <span class="detail-value">${formattedEndDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Monthly Cost:</span>
                <span class="detail-value">$${monthlyAmount.toFixed(2)}</span>
              </div>
            </div>
            
            <p class="description">We're sorry to see you go! If you have any feedback or concerns, please don't hesitate to contact our support team. We'd love to help improve your experience.</p>
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
        subject: 'Subscription Cancellation Confirmation - OptimaleMD',
        html,
      });
      console.log(`Subscription cancellation email sent successfully to ${to}`);
    } catch (error) {
      console.error('Failed to send subscription cancellation email:', error);
      throw error;
    }
  }

  /**
   * Get timezone abbreviation (e.g., EST, EDT, PST, UTC) for a given timezone and date
   * @param timezone - IANA timezone string (e.g., "America/New_York")
   * @param date - Date object to determine DST (Daylight Saving Time)
   * @returns Timezone abbreviation string
   */
  private getTimezoneAbbreviation(timezone: string, date: Date): string {
    try {
      if (timezone === 'UTC') {
        return 'UTC';
      }
      
      // Use Intl.DateTimeFormat to get timezone name
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short'
      });
      
      const parts = formatter.formatToParts(date);
      const timeZoneName = parts.find(part => part.type === 'timeZoneName');
      
      return timeZoneName?.value || 'UTC';
    } catch (error) {
      console.error(`Error getting timezone abbreviation for ${timezone}:`, error);
      return 'UTC';
    }
  }
} 