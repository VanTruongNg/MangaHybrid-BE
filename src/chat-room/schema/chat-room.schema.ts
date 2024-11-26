import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ChatRoomType } from "../interface/chat.interface";
import mongoose from "mongoose";
import { User } from "src/auth/schemas/user.schema";

export type ChatRoomDocument = ChatRoom & Document;

@Schema({ timestamps: true })
export class ChatRoom {
    @Prop({ type: String, enum: ChatRoomType , required: true })
    type: ChatRoomType;

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
    participants: User[];

    @Prop({ type: String })
    lastMessage: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    lastSender: User;

    @Prop({ type: Date })
    lastMessageAt: Date;

    @Prop({ type: Boolean, default: true })
    isActive: boolean;
}
export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);
