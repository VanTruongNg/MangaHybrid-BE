import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema()
export class EmailVerification {

    @Prop()
    email: string

    @Prop()
    emailToken: string

    @Prop({ required: true, default: Date.now })
    timestamp: Date
}

export const EmailVerificationSchema = SchemaFactory.createForClass(EmailVerification)
EmailVerificationSchema.index({ timestamp: 1}, { expireAfterSeconds: 15*60 })