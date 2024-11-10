import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ timestamps: true })
export class PasswordReset {
    @Prop({ required: true, index: true })
    email: string;

    @Prop({ required: true })
    resetToken: string;

    @Prop({ required: true, default: Date.now })
    timestamp: Date;
}

export const PasswordResetSchema = SchemaFactory.createForClass(PasswordReset);
PasswordResetSchema.index({ timestamp: 1 }, { expireAfterSeconds: 15 * 60 });
PasswordResetSchema.index({ email: 1, resetToken: 1 });