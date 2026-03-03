import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AdminManagementService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
  ) {}

  async listAdmins() {
    const admins = await this.prisma.admin.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    return admins;
  }

  async createAdmin(data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: 'superadmin' | 'admin';
  }) {
    const normalizedEmail = data.email.toLowerCase().trim();

    const existing = await this.prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new BadRequestException('An admin with this email already exists');
    }

    // Generate a secure random password
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const admin = await this.prisma.admin.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        role: data.role,
        isEmailVerified: true, // Created by superadmin — skip verification
        isActive: true,
      },
    });

    // Send credentials email (best-effort)
    try {
      const plainText = `Hello ${data.firstName},\n\nAn admin account has been created for you at OptimaleMD.\n\nEmail: ${normalizedEmail}\nTemporary Password: ${tempPassword}\n\nPlease log in at the admin portal and change your password immediately.\n\nBest,\nOptimaleMD Team`;

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
            .info-box {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 5px;
              margin: 20px 0;
              border-left: 4px solid #000000;
              text-align: left;
            }
            .info-box p {
              margin: 6px 0;
              font-size: 15px;
              color: #333333;
            }
            .info-box .label {
              font-weight: bold;
              color: #000000;
            }
            .warning-box {
              background-color: #fff8e1;
              padding: 15px 20px;
              border-radius: 5px;
              margin: 20px 0;
              border-left: 4px solid #f59e0b;
              text-align: left;
            }
            .warning-box p {
              margin: 0;
              font-size: 14px;
              color: #92400e;
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
              <h2 class="title">Admin Account Created</h2>
              <p class="description">Hi ${data.firstName},</p>
              <p class="description">An admin account has been created for you at OptimaleMD. Use the credentials below to log in to the admin portal.</p>

              <div class="info-box">
                <p><span class="label">Email:</span> ${normalizedEmail}</p>
                <p><span class="label">Temporary Password:</span> ${tempPassword}</p>
              </div>

              <div class="warning-box">
                <p>⚠️ Please log in and change your password immediately after signing in.</p>
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

      await this.mailerService.sendEmail(
        normalizedEmail,
        'Your OptimaleMD Admin Account',
        plainText,
        html,
      );
    } catch (err) {
      console.error('Failed to send admin credentials email (non-fatal):', err);
    }

    const { password: _, ...adminWithoutPassword } = admin;
    return adminWithoutPassword;
  }

  async updateAdminRole(adminId: string, newRole: 'superadmin' | 'admin', requesterId: string) {
    if (adminId === requesterId) {
      throw new BadRequestException('You cannot change your own role');
    }

    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const updated = await this.prisma.admin.update({
      where: { id: adminId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    return updated;
  }

  async toggleAdminActive(adminId: string, requesterId: string) {
    if (adminId === requesterId) {
      throw new BadRequestException('You cannot deactivate yourself');
    }

    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const updated = await this.prisma.admin.update({
      where: { id: adminId },
      data: { isActive: !admin.isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    return updated;
  }

  async changeOwnPassword(adminId: string, currentPassword: string, newPassword: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const isValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordErrors: string[] = [];
    if (newPassword.length < 8) passwordErrors.push('at least 8 characters');
    if (!/[A-Z]/.test(newPassword)) passwordErrors.push('an uppercase letter');
    if (!/[a-z]/.test(newPassword)) passwordErrors.push('a lowercase letter');
    if (!/[0-9]/.test(newPassword)) passwordErrors.push('a number');
    if (!/[^A-Za-z0-9]/.test(newPassword)) passwordErrors.push('a special character');

    if (passwordErrors.length > 0) {
      throw new BadRequestException(`Password must contain: ${passwordErrors.join(', ')}`);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async deleteAdmin(adminId: string, requesterId: string) {
    if (adminId === requesterId) {
      throw new BadRequestException('You cannot delete yourself');
    }

    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    await this.prisma.admin.delete({ where: { id: adminId } });

    return { success: true, message: 'Admin deleted successfully' };
  }
}
