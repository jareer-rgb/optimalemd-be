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
            <div class="logo">OptimalEMD</div>
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
            <p>&copy; ${new Date().getFullYear()} OptimalEMD</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"OptimalEMD" <${this.configService.get<string>('SMTP_FROM')}>`,
        to,
        subject: 'Verify Your Email - OptimalEMD',
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
            <div class="logo">OptimalEMD</div>
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
            <p>&copy; ${new Date().getFullYear()} OptimalEMD</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"OptimalEMD" <${this.configService.get<string>('SMTP_FROM')}>`,
        to,
        subject: 'Reset Your Password - OptimalEMD',
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
            <div class="logo">OptimalEMD</div>
          </div>
          <div class="content">
            <h2 class="title">Welcome to OptimalEMD!</h2>
            <p class="description">Hi ${name},</p>
            <p class="description">Welcome to OptimalEMD! Your account has been successfully verified.</p>
            
            <div class="welcome-message">
              <span class="welcome-icon">🎉</span>
              <p style="margin: 0 0 10px 0; color: #dc2626; font-weight: bold; font-size: 18px;">Your account is now active!</p>
              <p style="margin: 0;">You can now access all features of OptimalEMD.</p>
            </div>
            
            <div class="cta-section">
              <p style="margin: 0 0 10px 0;"><strong>Ready to get started?</strong></p>
              <p style="margin: 0;">Log in to your account and explore our services.</p>
              <a href="${this.configService.get<string>('frontend.url')}/login" class="cta-button">Login Now</a>
            </div>
            
            <p class="description">Thank you for choosing OptimalEMD!</p>
          </div>
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} OptimalEMD</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"OptimalEMD" <${this.configService.get<string>('SMTP_FROM')}>`,
        to,
        subject: 'Welcome to OptimalEMD!',
        html,
      });
      console.log(`Welcome email sent successfully to ${to}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }
  }
} 