import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { User } from "./user.schema";

@Schema({
    timestamps: true
})
export class Token {
    @Prop()
    token: string

    @Prop({type: mongoose.Types.ObjectId, ref: "User"})
    user: User

    @Prop({ default: false })
    isRevoked: boolean

    @Prop()
    expiresAt: Date;
}

export const TokenSchema = SchemaFactory.createForClass(Token)
TokenSchema.index({ expiresAt: 1}, { expires: '1d'})