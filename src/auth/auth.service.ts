import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { ConfigService } from '@nestjs/config';
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto, AuthResponseDataDto, UserResponseDto, UpdatePasswordDto } from './dto/auth.dto';
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
    const { email, password, ...userData } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Create user
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        email,
        password: hashedPassword,
        dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : null,
        emailVerificationToken,
        emailVerificationTokenExpiry,
      },
    });

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    // Send email verification email
    try {
      const verificationLink = `${this.configService.get<string>('frontend.url')}/verify-email?token=${emailVerificationToken}`;
      await this.mailerService.sendEmailVerificationEmail(
        email,
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
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDataDto> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
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
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      accessToken,
      user: userWithoutPassword as UserResponseDto,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        message: 'If an account with that email exists, a password reset link has been sent.',
        email,
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to database
    await this.prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Create reset link using configuration
    const frontendUrl = this.configService.get<string>('frontend.url');
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send password reset email
    try {
      await this.mailerService.sendPasswordResetEmail(
        email,
        user.firstName,
        resetLink
      );
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Remove the token if email fails
      await this.prisma.user.update({
        where: { email },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
      throw new BadRequestException('Failed to send password reset email. Please try again later.');
    }

    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
      email,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    // Find user with valid reset token
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

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Send welcome back email
    try {
      await this.mailerService.sendWelcomeEmail(user.email, user.firstName);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail the password reset if welcome email fails
    }

    return {
      message: 'Password has been reset successfully',
      email: user.email,
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
      email: user.email,
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
      await this.mailerService.sendWelcomeEmail(user.email, user.firstName);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail verification if welcome email fails
    }

    return {
      message: 'Email verified successfully',
      email: user.email,
    };
  }

  async resendVerification(email: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { email },
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
      where: { email },
      data: {
        emailVerificationToken,
        emailVerificationTokenExpiry,
      },
    });

    // Send new verification email
    try {
      const verificationLink = `${this.configService.get<string>('frontend.url')}/verify-email?token=${emailVerificationToken}`;
      await this.mailerService.sendEmailVerificationEmail(
        email,
        user.firstName,
        verificationLink
      );
    } catch (error) {
      console.error('Failed to send email verification email:', error);
      // Remove the token if email fails
      await this.prisma.user.update({
        where: { email },
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

  async getVerificationStatus(email: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        email: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      isEmailVerified: user.isEmailVerified,
      email: user.email,
    };
  }
}
