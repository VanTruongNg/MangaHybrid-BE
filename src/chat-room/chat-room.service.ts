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

    async createPrivateRoom(participants: string[]) {
        if (participants.length !== 2) {
            throw new HttpException('CHAT_ROOM.NEED_2_PARTICIPANTS', HttpStatus.BAD_REQUEST);
        }

        const [user1, user2] = participants;

        const [user1Id, user2Id] = await Promise.all([
            this.userModel.findById(user1),
            this.userModel.findById(user2)
        ]);

        if (!user1Id || !user2Id) {
            throw new HttpException('CHAT_ROOM.USER_NOT_FOUND', HttpStatus.NOT_FOUND);
        }

        const existingRoom = await this.chatRoomModel.findOne({
            type: ChatRoomType.PRIVATE,
            participants: {
                $all: [user1Id, user2Id],
                $size: 2
            }
        }).populate('participants', '_id name avatarUrl');

        if (existingRoom) {
            return existingRoom;
        }

        const newRoom = await this.chatRoomModel.create({
            type: ChatRoomType.PRIVATE,
            participants: [user1Id, user2Id],
            isActive: true
        });

        return newRoom.populate('participants', '_id name avatarUrl');
    }

    async getUserPrivateRooms(userId: string): Promise<ChatRoom[]> {
        return await this.chatRoomModel.find({
            type: ChatRoomType.PRIVATE,
            participants: userId,
            isActive: true
        })
            .populate('participants', '_id name avatarUrl')
            .populate('lastSender', '_id name avatarUrl')
            .sort({ lastMessageAt: -1, createdAt: -1 });
    }

    async getPrivateRoom(roomId: string, userId: string): Promise<ChatRoom> {
        const room = await this.chatRoomModel.findOne({
            _id: roomId,
            type: ChatRoomType.PRIVATE,
            participants: userId
        }).populate('participants', '_id name avatarUrl');

        if (!room) {
            throw new HttpException('Room not found or access denied', HttpStatus.NOT_FOUND);
        }

        return room;
    }

    async getPrivateMessages(roomId: string, userId: string): Promise<Message[]> {
        const room = await this.chatRoomModel.findOne({
            _id: roomId,
            type: ChatRoomType.PRIVATE,
            participants: userId
        });
        if (!room) {
            throw new HttpException('CHAT_ROOM.ROOM_NOT_FOUND', HttpStatus.NOT_FOUND);
        }

        return await this.messageModel.find({
            roomId: roomId
        })
            .populate('sender', '_id name avatarUrl')
            .sort({ createdAt: -1 })
            .limit(20);
    }

    async addPrivateMessage(senderId: string, receiverId: string, content: string): Promise<{room: ChatRoom, message: Message}> {
        const [room, sender] = await Promise.all([
            this.createPrivateRoom([senderId, receiverId]),
            this.userModel.findById(senderId).select('_id name avatarUrl')
        ]);

        if (!sender) {
            throw new HttpException('CHAT_ROOM.SENDER_NOT_FOUND', HttpStatus.NOT_FOUND);
        }

        const [newMessage] = await Promise.all([
            this.messageModel.create({
                roomId: room,
                sender: sender,
                content,
                readBy: [sender]
            }),
            this.chatRoomModel.findByIdAndUpdate(room._id, {
                lastMessage: content,
                lastSender: sender,
                lastMessageAt: new Date()
            })
        ]);

        await newMessage.populate('sender', '_id name avatarUrl');

        return { room, message: newMessage };
    }

    async markMessageAsRead(messageId: string, userId: string): Promise<void> {
        await this.messageModel.findByIdAndUpdate(messageId, {
            $addToSet: { readBy: userId }
        });
    }

    async getUnreadMessageCount(roomId: string, userId: string): Promise<number> {
        return await this.messageModel.countDocuments({
            roomId,
            sender: { $ne: userId },
            readBy: { $nin: [userId] }
        });
    }
}
