import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Inject, forwardRef } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/message.dto';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService
  ) {}

  async handleConnection(client: Socket) {
    try {
      console.log('New WebSocket connection attempt');
      console.log('Handshake auth:', client.handshake.auth);
      console.log('Handshake headers:', client.handshake.headers);
      
      // Extract user ID from auth object
      const userId = client.handshake.auth?.userId;
      
      if (!userId) {
        console.log('No userId provided in auth, disconnecting client');
        client.disconnect();
        return;
      }

      this.connectedUsers.set(userId, client.id);
      client.join(`user_${userId}`);
      
      console.log(`✅ User ${userId} connected with socket ${client.id}`);
      console.log('Current connected users:', Array.from(this.connectedUsers.keys()));
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Remove user from connected users
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: CreateMessageDto & { senderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { senderId, ...createMessageDto } = data;
      
      // Don't create message in database here - it's already created via API call
      // Just broadcast the message to the receiver
      const message = {
        ...createMessageDto,
        senderId,
        id: `temp_${Date.now()}`, // Temporary ID for real-time display
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Send to receiver if online
      const receiverSocketId = this.connectedUsers.get(message.receiverId);
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('new_message', message);
      }
      
      // Send confirmation to sender
      client.emit('message_sent', message);
      
      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      client.emit('message_error', { error: error.message });
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @MessageBody() data: { otherParticipantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { otherParticipantId } = data;
    client.join(`conversation_${otherParticipantId}`);
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @MessageBody() data: { otherParticipantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { otherParticipantId } = data;
    client.leave(`conversation_${otherParticipantId}`);
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @MessageBody() data: { messageId: string; senderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { messageId, senderId } = data;
      
      // Mark as read in database
      const message = await this.messagesService.markAsRead({ messageId }, senderId);
      
      // Notify sender that message was read
      const senderSocketId = this.connectedUsers.get(message.senderId);
      if (senderSocketId) {
        this.server.to(senderSocketId).emit('message_read', { messageId, readAt: new Date() });
      }
      
      return message;
    } catch (error) {
      console.error('Error marking message as read:', error);
      client.emit('mark_read_error', { error: error.message });
    }
  }

  // Helper method to send message to specific user
  sendMessageToUser(userId: string, event: string, data: any) {
    console.log(`Attempting to send ${event} to user ${userId}`);
    console.log('Current connected users:', Array.from(this.connectedUsers.keys()));
    console.log('Looking for userId:', userId);
    
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
      console.log(`✅ Sent ${event} to user ${userId} (socket: ${socketId})`);
    } else {
      console.log(`❌ User ${userId} is not connected, message not delivered`);
      console.log('Available user IDs:', Array.from(this.connectedUsers.keys()));
    }
  }

  // Helper method to send message to conversation participants
  sendMessageToConversation(senderId: string, receiverId: string, event: string, data: any) {
    // Send to receiver
    this.sendMessageToUser(receiverId, event, data);
    
    // Also send to sender for confirmation (optional)
    this.sendMessageToUser(senderId, 'message_sent', data);
  }

  // Helper method to check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
