import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

export enum NotificationType {
  NEW_CHAPTER = 'NEW_CHAPTER',
  NEW_COMMENT = 'NEW_COMMENT',
  MANGA_APPROVED = 'MANGA_APPROVED',
  MANGA_REJECTED = 'MANGA_REJECTED',
  NEW_MANGA_PENDING = 'NEW_MANGA_PENDING'
}

@Schema({ timestamps: true })
export class Notification {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Manga' })
    manga: mongoose.Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' })
    chapter: mongoose.Types.ObjectId;

    @Prop({ required: true })
    message: string;

    @Prop({
        type: String,
        enum: NotificationType,
        required: true
    })
    type: NotificationType;

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] })
    readBy: mongoose.Types.ObjectId[];

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], required: true })
    recipients: mongoose.Types.ObjectId[];
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ recipients: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });