import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { ConfigService } from '@nestjs/config';
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto, AuthResponseDataDto, UserResponseDto, UpdatePasswordDto } from './dto/auth.dto';
import { DoctorResponseDto } from '../doctors/dto/doctor.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDataDto> {
    const { password, ...userData } = registerDto;

    // Check if user already exists by medical record number
    const existingUserByMRN = await this.prisma.user.findUnique({
      where: { medicalRecordNo: userData.medicalRecordNo },
    });

    if (existingUserByMRN) {
      throw new ConflictException('User with this Medical Record Number already exists');
    }

    // Check if user already exists by primary email
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { primaryEmail: userData.primaryEmail },
    });

    if (existingUserByEmail) {
      throw new ConflictException('User with this primary email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Prepare user data for creation
    const userCreateData = {
      ...userData,
      password: hashedPassword,
      dateOfBirth: new Date(userData.dateOfBirth),
      dateOfFirstVisitPlanned: userData.dateOfFirstVisitPlanned ? new Date(userData.dateOfFirstVisitPlanned) : null,
      emailVerificationToken,
      emailVerificationTokenExpiry,
      // Map legacy fields for backward compatibility
      email: userData.primaryEmail,
      phone: userData.primaryPhone,
    };

    // Create user
    const user = await this.prisma.user.create({
      data: userCreateData,
    });

    // Generate JWT token
    const payload = { sub: user.id, email: user.primaryEmail };
    const accessToken = this.jwtService.sign(payload);

    // Send email verification email
    try {
      const verificationLink = `https://optimalmd-mu.vercel.app/verify-email?token=${emailVerificationToken}`;
      console.log('Generated verification link:', verificationLink);
      
      await this.mailerService.sendEmailVerificationEmail(
        userData.primaryEmail,
        user.firstName,
        verificationLink
      );
    } catch (error) {
      console.error('Failed to send email verification email:', error);
      // Don't fail registration if email fails
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      accessToken,
      user: userWithoutPassword as UserResponseDto,
      userType: 'user' as const,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDataDto> {
    const { userType, email, password } = loginDto;

    if (userType === 'user') {
      // Handle user (patient) login
      return this.loginUser(email, password);
    } else if (userType === 'doctor') {
      // Handle doctor login
      return this.loginDoctor(email, password);
    } else {
      throw new BadRequestException('Invalid user type. Must be either "user" or "doctor"');
    }
  }

  /**
   * Login user (patient)
   */
  private async loginUser(email: string, password: string): Promise<AuthResponseDataDto> {
    // Find user by primary email
    const user = await this.prisma.user.findUnique({
      where: { primaryEmail: email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email address before logging in');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.primaryEmail, userType: 'user' };
    const accessToken = this.jwtService.sign(payload);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      accessToken,
      user: userWithoutPassword as UserResponseDto,
      userType: 'user' as const,
    };
  }

  /**
   * Login doctor
   */
  private async loginDoctor(email: string, password: string): Promise<AuthResponseDataDto> {
    // Find doctor by email
    const doctor = await this.prisma.doctor.findUnique({
      where: { email },
    });

    if (!doctor) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if doctor is active
    if (!doctor.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if email is verified
    if (!doctor.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email address before logging in');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, doctor.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { sub: doctor.id, email: doctor.email, userType: 'doctor' };
    const accessToken = this.jwtService.sign(payload);

    // Return doctor data without password
    const { password: _, ...doctorWithoutPassword } = doctor;

    return {
      accessToken,
      user: doctorWithoutPassword as DoctorResponseDto,
      userType: 'doctor' as const,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { primaryEmail: email },
    });

    // Check if doctor exists
    const doctor = await this.prisma.doctor.findUnique({
      where: { email },
    });

    if (!user && !doctor) {
      // Don't reveal if user/doctor exists or not for security
      return {
        message: 'If an account with that email exists, a password reset link has been sent.',
        email,
      };
    }

    // Determine which type of account this is
    const accountType = user ? 'user' : 'doctor';
    const account = user || doctor;

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to appropriate table
    if (accountType === 'user') {
      await this.prisma.user.update({
        where: { primaryEmail: email },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });
    } else {
      await this.prisma.doctor.update({
        where: { email },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });
    }

    // Create reset link using configuration
    const frontendUrl = "https://optimalmd-mu.vercel.app";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&type=${accountType}`;

    // Send password reset email
    try {
      const firstName = accountType === 'user' ? (account as any).firstName : (account as any).firstName;
      await this.mailerService.sendPasswordResetEmail(
        email,
        firstName,
        resetLink
      );
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Remove the token if email fails
      if (accountType === 'user') {
        await this.prisma.user.update({
          where: { primaryEmail: email },
          data: {
            resetToken: null,
            resetTokenExpiry: null,
          },
        });
      } else {
        await this.prisma.doctor.update({
          where: { email },
          data: {
            resetToken: null,
            resetTokenExpiry: null,
          },
        });
      }
      throw new BadRequestException('Failed to send password reset email. Please try again later.');
    }

    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
      email,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, accountType, newPassword } = resetPasswordDto;

    let account;
    let email;

    if (accountType === 'user') {
      // Find user with valid reset token
      account = await this.prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date(),
          },
        },
      });
      if (account) {
        email = (account as any).primaryEmail;
      }
    } else {
      // Find doctor with valid reset token
      account = await this.prisma.doctor.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date(),
          },
        },
      });
      if (account) {
        email = (account as any).email;
      }
    }

    if (!account) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token in appropriate table
    if (accountType === 'user') {
      await this.prisma.user.update({
        where: { id: account.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
    } else {
      await this.prisma.doctor.update({
        where: { id: account.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
    }

    // Send welcome back email
    try {
      const firstName = (account as any).firstName;
      await this.mailerService.sendWelcomeEmail(email, firstName);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail the password reset if welcome email fails
    }

    return {
      message: 'Password has been reset successfully',
      email,
    };
  }

  async updatePassword(userId: string, updatePasswordDto: UpdatePasswordDto): Promise<UserResponseDto> {
    const { currentPassword, newPassword } = updatePasswordDto;

    // Get user with current password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
      },
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as UserResponseDto;
  }

  async validateResetToken(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    return {
      primaryEmail: user.primaryEmail,
      valid: true,
    };
  }

  async clearExpiredTokens() {
    // Clean up expired reset tokens
    await this.prisma.user.updateMany({
      where: {
        resetTokenExpiry: {
          lt: new Date(),
        },
      },
      data: {
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Clean up expired email verification tokens
    await this.prisma.user.updateMany({
      where: {
        emailVerificationTokenExpiry: {
          lt: new Date(),
        },
      },
      data: {
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      },
    });
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as UserResponseDto;
  }

  async verifyEmail(token: string) {
    // Find user with valid verification token
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user to mark email as verified and clear token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      },
    });

    // Send welcome email
    try {
      await this.mailerService.sendWelcomeEmail(user.primaryEmail, user.firstName);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail verification if welcome email fails
    }

    return {
      message: 'Email verified successfully',
      primaryEmail: user.primaryEmail,
    };
  }

  async resendVerification(email: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { primaryEmail: email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with new verification token
    await this.prisma.user.update({
      where: { primaryEmail: email },
      data: {
        emailVerificationToken,
        emailVerificationTokenExpiry,
      },
    });

    // Send new verification email
    try {
      const verificationLink = `https://optimalmd-mu.vercel.app/verify-email?token=${emailVerificationToken}`;
      console.log('Resend - Generated verification link:', verificationLink);
      
      await this.mailerService.sendEmailVerificationEmail(
        email,
        user.firstName,
        verificationLink
      );
    } catch (error) {
      console.error('Failed to send email verification email:', error);
      // Remove the token if email fails
      await this.prisma.user.update({
        where: { primaryEmail: email },
        data: {
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
        },
      });
      throw new BadRequestException('Failed to send verification email. Please try again later.');
    }

    return {
      message: 'Verification email sent successfully',
      email,
    };
  }

  async getVerificationStatus(primaryEmail: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { primaryEmail },
      select: {
        primaryEmail: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      isEmailVerified: user.isEmailVerified,
      primaryEmail: user.primaryEmail,
    };
  }
}
