import { Controller, Post, Get, Put, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto, MessageResponseDto, GetMessagesDto, MarkAsReadDto, GetConversationsDto } from './dto/message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({
    summary: 'Send a message',
    description: 'Send a message to another user (doctor or patient)'
  })
  @ApiResponse({ status: 201, description: 'Message sent successfully', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Receiver not found' })
  async createMessage(@Body() createMessageDto: CreateMessageDto, @Request() req) {
    const senderId = req.user.id;
    return this.messagesService.createMessage(createMessageDto, senderId);
  }

  @Get('conversation')
  @ApiOperation({
    summary: 'Get messages between two users',
    description: 'Get all messages between the current user and another participant'
  })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessages(@Query() getMessagesDto: GetMessagesDto, @Request() req) {
    const userId = req.user.id;
    return this.messagesService.getMessages(getMessagesDto, userId);
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'Get all conversations for a user',
    description: 'Get all conversations with last message and unread count'
  })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async getConversations(@Query() getConversationsDto: GetConversationsDto) {
    return this.messagesService.getConversations(getConversationsDto);
  }

  @Put('read')
  @ApiOperation({
    summary: 'Mark a message as read',
    description: 'Mark a specific message as read'
  })
  @ApiResponse({ status: 200, description: 'Message marked as read', type: MessageResponseDto })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async markAsRead(@Body() markAsReadDto: MarkAsReadDto, @Request() req) {
    const userId = req.user.id;
    return this.messagesService.markAsRead(markAsReadDto, userId);
  }

  @Put('read-all')
  @ApiOperation({
    summary: 'Mark all messages from a sender as read',
    description: 'Mark all unread messages from a specific sender as read'
  })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAllAsRead(
    @Body() body: { senderId: string },
    @Request() req
  ) {
    const receiverId = req.user.id;
    return this.messagesService.markAllAsRead(body.senderId, receiverId);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread message count',
    description: 'Get the total number of unread messages for the current user'
  })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getUnreadCount(@Request() req) {
    const userId = req.user.id;
    return this.messagesService.getUnreadCount(userId);
  }
}
