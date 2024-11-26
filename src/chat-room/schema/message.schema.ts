import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { User } from "src/auth/schemas/user.schema";
import { ChatRoom } from "src/chat-room/schema/chat-room.schema";

@Schema({ timestamps: true })
export class Message {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom' })
    roomId: ChatRoom;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    sender: User;

    @Prop({ required: true })
    content: string;

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
    readBy: User[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);
