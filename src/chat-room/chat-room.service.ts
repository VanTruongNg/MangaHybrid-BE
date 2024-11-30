import { HttpStatus, HttpException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChatRoom } from './schema/chat-room.schema';
import { Model } from 'mongoose';
import { ChatRoomType } from './interface/chat.interface';
import { Message } from './schema/message.schema';
import { User } from 'src/auth/schemas/user.schema';
import { randomUUID } from 'crypto';

@Injectable()
export class ChatRoomService implements OnModuleInit {
    private publicRoomId: string;
    private publicMessage: Message[] = [];
    private readonly MAX_PUBLIC_MESSAGES = 100;

    constructor(
        @InjectModel(ChatRoom.name) private chatRoomModel: Model<ChatRoom>,
        @InjectModel(Message.name) private messageModel: Model<Message>,
        @InjectModel(User.name) private userModel: Model<User>
    ){}

    async onModuleInit() {
        await this.chatRoomModel.deleteMany({ type: ChatRoomType.PUBLIC });
        const publicRoom = await this.chatRoomModel.create({
            type: ChatRoomType.PUBLIC,
            isActive: true
        });
        this.publicRoomId = publicRoom._id.toString();
    }

    getPublicRoomId(): string {
        return this.publicRoomId
    }

    getPublicMessage(): Message[] {
        return this.publicMessage.map(msg => ({
            ...msg,
            sender: msg.sender
        }));
    }

    async addPublicMessage(senderId: string, content: string): Promise<Message> {
        const sender = await this.userModel.findById(senderId)
          .select('_id name avatarUrl');
        if (!sender) {
          throw new HttpException('CHAT_ROOM.SENDER_NOT_FOUND', HttpStatus.NOT_FOUND);
        }
    
        const room = await this.chatRoomModel.findById(this.publicRoomId);
        if (!room) {
          throw new HttpException('CHAT_ROOM.ROOM_NOT_FOUND', HttpStatus.NOT_FOUND);
        }
    
        const message = {
          id: randomUUID(),
          roomId: room,
          sender: sender,
          content,
          readBy: [sender],
          createdAt: new Date()
        } as Message;
    
        this.publicMessage.push(message);
    
        if (this.publicMessage.length > this.MAX_PUBLIC_MESSAGES) {
          this.publicMessage.shift();
        }
    
        await this.chatRoomModel.findByIdAndUpdate(this.publicRoomId, {
          lastMessage: content,
          lastSender: sender,
          lastMessageAt: new Date()
        });
    
        return message;
    }

    async addParticipant(userId: string) {
        await this.chatRoomModel.findByIdAndUpdate(
            this.publicRoomId,
            { $addToSet: { participants: userId } }
        );
    }

    async removeParticipant(userId: string) {
        await this.chatRoomModel.findByIdAndUpdate(
            this.publicRoomId,
            { $pull: { participants: userId } }
        );
    }
}
