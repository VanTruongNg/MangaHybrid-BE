import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { User } from "./user.schema";

@Schema({
    timestamps: true
})
export class Token {
    @Prop({ 
        required: true,
        index: true 
    })
    token: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    })
    user: User;

    @Prop({ default: false })
    isRevoked: boolean

    @Prop({
        type: Date,
        required: true,
        expires: '24h',
        default: () => new Date()
    })
    expiresAt: Date;
}

export const TokenSchema = SchemaFactory.createForClass(Token)

TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
TokenSchema.index({ user: 1, isRevoked: 1 })