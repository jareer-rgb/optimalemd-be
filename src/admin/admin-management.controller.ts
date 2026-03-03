import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { AdminManagementService } from './admin-management.service';

@ApiTags('Admin Management (Super Admin Only)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@Controller('admin/management')
export class AdminManagementController {
  constructor(private readonly adminManagementService: AdminManagementService) {}

  @Get('admins')
  @ApiOperation({ summary: 'List all admins' })
  async listAdmins() {
    const admins = await this.adminManagementService.listAdmins();
    return { success: true, data: admins };
  }

  @Post('admins')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new admin' })
  async createAdmin(
    @Body() body: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role: 'superadmin' | 'admin';
    },
  ) {
    const admin = await this.adminManagementService.createAdmin(body);
    return { success: true, message: 'Admin created successfully', data: admin };
  }

  @Put('admins/:id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change admin role (superadmin/admin)' })
  async updateRole(
    @Param('id') id: string,
    @Body('role') role: 'superadmin' | 'admin',
    @Req() req: any,
  ) {
    const admin = await this.adminManagementService.updateAdminRole(id, role, req.user.id);
    return { success: true, message: `Role updated to ${role}`, data: admin };
  }

  @Put('admins/:id/toggle-active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate/deactivate an admin' })
  async toggleActive(@Param('id') id: string, @Req() req: any) {
    const admin = await this.adminManagementService.toggleAdminActive(id, req.user.id);
    return {
      success: true,
      message: admin.isActive ? 'Admin activated' : 'Admin deactivated',
      data: admin,
    };
  }

  @Delete('admins/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an admin' })
  async deleteAdmin(@Param('id') id: string, @Req() req: any) {
    const result = await this.adminManagementService.deleteAdmin(id, req.user.id);
    return result;
  }

  @Put('profile/change-password')
  @Roles() // override class-level @Roles('superadmin') — any authenticated admin can change their own password
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password' })
  async changePassword(
    @Body() body: { currentPassword: string; newPassword: string },
    @Req() req: any,
  ) {
    const adminId = req.user.sub || req.user.id;
    const result = await this.adminManagementService.changeOwnPassword(
      adminId,
      body.currentPassword,
      body.newPassword,
    );
    return { success: true, message: result.message };
  }
}
