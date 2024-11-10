import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ timestamps: true })
export class EmailVerification {
    @Prop({ required: true, index: true })
    email: string;

    @Prop({ required: true })
    emailToken: string;

    @Prop({ required: true, default: Date.now })
    timestamp: Date;
}

export const EmailVerificationSchema = SchemaFactory.createForClass(EmailVerification);
EmailVerificationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 15 * 60 });
EmailVerificationSchema.index({ email: 1, emailToken: 1 });