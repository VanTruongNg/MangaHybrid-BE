import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema()
export class PasswordReset {

    @Prop()
    email: string

    @Prop()
    resetToken: string

    @Prop({ required: true, default: Date.now })
    timestamp: Date
}

export const PasswordResetSchema = SchemaFactory.createForClass(PasswordReset)
PasswordResetSchema.index({ timestamp: 1 }, { expireAfterSeconds: 15*60 })