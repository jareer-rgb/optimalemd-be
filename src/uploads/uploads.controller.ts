import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Get,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('driving-license')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload driving license', description: 'Upload a driving license image or PDF for identity verification' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Driving license uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async uploadDrivingLicense(
    @CurrentUser() user: any,
    @UploadedFile() file: any,
  ) {
    const result = await this.uploadsService.uploadDrivingLicense(user.id, file);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Driving license uploaded successfully',
      data: result,
    };
  }

  @Post('photo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload photo', description: 'Upload a photo for identity verification' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Photo uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async uploadPhoto(
    @CurrentUser() user: any,
    @UploadedFile() file: any,
  ) {
    const result = await this.uploadsService.uploadPhoto(user.id, file);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Photo uploaded successfully',
      data: result,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get upload status', description: 'Check if user has uploaded required documents' })
  @ApiResponse({ status: 200, description: 'Upload status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUploadStatus(@CurrentUser() user: any) {
    const status = await this.uploadsService.getUserUploadStatus(user.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Upload status retrieved successfully',
      data: status,
    };
  }

  @Delete('driving-license')
  @ApiOperation({ summary: 'Remove driving license', description: 'Remove the uploaded driving license' })
  @ApiResponse({ status: 200, description: 'Driving license removed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async removeDrivingLicense(@CurrentUser() user: any) {
    await this.uploadsService.removeDrivingLicense(user.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Driving license removed successfully',
    };
  }

  @Delete('photo')
  @ApiOperation({ summary: 'Remove photo', description: 'Remove the uploaded photo' })
  @ApiResponse({ status: 200, description: 'Photo removed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async removePhoto(@CurrentUser() user: any) {
    await this.uploadsService.removePhoto(user.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Photo removed successfully',
    };
  }

  @Get('drivingLicense/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get driving license file', description: 'Retrieve the driving license file for preview' })
  @ApiResponse({ status: 200, description: 'File retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getDrivingLicense(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    // Users can only view their own documents
    if (user.id !== userId) {
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'Access denied' });
    }
    
    try {
      const filePath = await this.uploadsService.getFilePath(userId, 'drivingLicense');
      return res.sendFile(filePath);
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'File not found' });
    }
  }

  @Get('photo/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get photo file', description: 'Retrieve the photo file for preview' })
  @ApiResponse({ status: 200, description: 'File retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getPhoto(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    // Users can only view their own documents
    if (user.id !== userId) {
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'Access denied' });
    }
    
    try {
      const filePath = await this.uploadsService.getFilePath(userId, 'photo');
      return res.sendFile(filePath);
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'File not found' });
    }
  }

  @Post('lab-order/:orderId')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload lab order (Admin)', description: 'Upload a lab order for a lab order' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Lab order uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 404, description: 'Lab order not found' })
  async uploadLabOrder(
    @Param('orderId') orderId: string,
    @UploadedFile() file: any,
  ) {
    const result = await this.uploadsService.uploadLabOrder(orderId, file);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Lab order uploaded successfully',
      data: result,
    };
  }

  @Post('lab-results/:orderId')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload lab results (Admin)', description: 'Upload lab results for a lab order' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Lab results uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 404, description: 'Lab order not found' })
  async uploadLabResults(
    @Param('orderId') orderId: string,
    @UploadedFile() file: any,
  ) {
    const result = await this.uploadsService.uploadLabResults(orderId, file);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Lab results uploaded successfully',
      data: result,
    };
  }

  @Get('lab-order/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get lab order file', description: 'Retrieve the lab order file for preview' })
  @ApiResponse({ status: 200, description: 'File retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getLabOrder(
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ) {
    try {
      const filePath = await this.uploadsService.getLabFilePath(orderId, 'receipt');
      
      // Determine content type from file extension
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      } else if (ext === '.webp') {
        contentType = 'image/webp';
      }
      
      // Set content type header
      res.setHeader('Content-Type', contentType);
      
      return res.sendFile(filePath);
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'File not found' });
    }
  }

  @Get('lab-results/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get lab results file', description: 'Retrieve the lab results file for preview' })
  @ApiResponse({ status: 200, description: 'File retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getLabResults(
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ) {
    try {
      const filePath = await this.uploadsService.getLabFilePath(orderId, 'results');
      
      // Determine content type from file extension
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      } else if (ext === '.webp') {
        contentType = 'image/webp';
      }
      
      // Set content type header
      res.setHeader('Content-Type', contentType);
      
      return res.sendFile(filePath);
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'File not found' });
    }
  }

  @Get('admin/drivingLicense/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get driving license file (Admin)', description: 'Retrieve the driving license file for a patient (admin access)' })
  @ApiResponse({ status: 200, description: 'File retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getDrivingLicenseAdmin(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    try {
      const filePath = await this.uploadsService.getFilePath(userId, 'drivingLicense');
      
      // Determine content type from file extension
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      } else if (ext === '.webp') {
        contentType = 'image/webp';
      }
      
      // Set content type header
      res.setHeader('Content-Type', contentType);
      
      return res.sendFile(filePath);
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'File not found' });
    }
  }

  @Get('admin/photo/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get photo file (Admin)', description: 'Retrieve the photo file for a patient (admin access)' })
  @ApiResponse({ status: 200, description: 'File retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getPhotoAdmin(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    try {
      const filePath = await this.uploadsService.getFilePath(userId, 'photo');
      
      // Determine content type from file extension
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      } else if (ext === '.webp') {
        contentType = 'image/webp';
      }
      
      // Set content type header
      res.setHeader('Content-Type', contentType);
      
      return res.sendFile(filePath);
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'File not found' });
    }
  }

  @Delete('lab-order/:orderId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove lab order (Admin)', description: 'Remove a lab order for a lab order' })
  @ApiResponse({ status: 200, description: 'Lab order removed successfully' })
  @ApiResponse({ status: 404, description: 'Lab order not found' })
  async removeLabOrder(
    @Param('orderId') orderId: string,
  ) {
    await this.uploadsService.removeLabOrder(orderId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Lab order removed successfully',
    };
  }

  @Delete('lab-results/:orderId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove lab results (Admin)', description: 'Remove lab results for a lab order' })
  @ApiResponse({ status: 200, description: 'Lab results removed successfully' })
  @ApiResponse({ status: 404, description: 'Lab order or results not found' })
  async removeLabResults(
    @Param('orderId') orderId: string,
  ) {
    await this.uploadsService.removeLabResults(orderId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Lab results removed successfully',
    };
  }
}

