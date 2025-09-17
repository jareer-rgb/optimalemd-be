import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ description: 'Message content', example: 'Hello, how are you feeling today?' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Receiver ID (doctor or patient)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  receiverId: string;

  @ApiProperty({ description: 'Sender type', example: 'patient', enum: ['doctor', 'patient'] })
  @IsString()
  @IsNotEmpty()
  senderType: 'doctor' | 'patient';

  @ApiProperty({ description: 'Receiver type', example: 'doctor', enum: ['doctor', 'patient'] })
  @IsString()
  @IsNotEmpty()
  receiverType: 'doctor' | 'patient';
}

export class MessageResponseDto {
  @ApiProperty({ description: 'Message ID' })
  id: string;

  @ApiProperty({ description: 'Message content' })
  content: string;

  @ApiProperty({ description: 'Sender ID' })
  senderId: string;

  @ApiProperty({ description: 'Receiver ID' })
  receiverId: string;

  @ApiProperty({ description: 'Sender type' })
  senderType: string;

  @ApiProperty({ description: 'Receiver type' })
  receiverType: string;

  @ApiProperty({ description: 'Is message read' })
  isRead: boolean;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;

  @ApiProperty({ description: 'Sender name' })
  senderName?: string;

  @ApiProperty({ description: 'Receiver name' })
  receiverName?: string;
}

export class GetMessagesDto {
  @ApiProperty({ description: 'Other participant ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  otherParticipantId: string;

  @ApiProperty({ description: 'Page number', example: 1, required: false })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: 'Messages per page', example: 20, required: false })
  @IsOptional()
  limit?: number = 20;
}

export class MarkAsReadDto {
  @ApiProperty({ description: 'Message ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  messageId: string;
}

export class GetConversationsDto {
  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'User type', example: 'patient', enum: ['doctor', 'patient'] })
  @IsString()
  @IsNotEmpty()
  userType: 'doctor' | 'patient';
}
