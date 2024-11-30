import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { WebsocketGateway } from 'src/websocket/websocket.gateway';
import { NotificationResponse } from './interface/notification.res';
import { Notification, NotificationType } from './schema/notification.schema';

@Injectable()
export class NotificationService {
    constructor(
        @InjectModel(Notification.name) private readonly notificationModel: Model<Notification>,
        private readonly websocketGateway: WebsocketGateway
    ) {}

    private formatNotification(notification: any, userId: string): NotificationResponse {
        return {
            id: notification._id,
            type: notification.type,
            message: notification.message,
            manga: notification.manga ? {
                id: notification.manga._id,
                title: notification.manga.title,
                coverImg: notification.manga.coverImg
            } : undefined,
            chapter: notification.chapter ? {
                id: notification.chapter._id,
                number: notification.chapter.number
            } : undefined,
            isRead: notification.readBy.includes(userId),
            createdAt: notification.createdAt
        }
    }

    async getUserNotifications(userId: string): Promise<NotificationResponse[]> {
        const notifications = await this.notificationModel.find({
          recipients: userId
        })
        .sort({ createdAt: -1 })
        .populate('manga', '_id title coverImg')
        .populate('chapter', '_id number')
        .lean();
    
        return notifications.map(notification => this.formatNotification(notification, userId));
    }

    async getUnreadNotifications(userId: string): Promise<NotificationResponse[]> {
      const notifications = await this.notificationModel.find({
        recipients: userId,
        readBy: { $ne: userId }
      })
      .sort({ createdAt: -1 })
      .populate('manga', '_id title coverImg')
      .populate('chapter', '_id number')
      .lean();
  
      return notifications.map(notification => 
        this.formatNotification(notification, userId)
      );
    }

    async markAsRead(notificationId: string, userId: string) {
        return this.notificationModel.findByIdAndUpdate(
          notificationId,
          { $addToSet: { readBy: userId } },
          { new: true }
        );
    }
    
    async markAllAsRead(userId: string) {
        return this.notificationModel.updateMany(
          { recipients: userId, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );
    }

    async createNotification(data: {
        type: NotificationType;
        message: string;
        recipients: mongoose.Types.ObjectId[];
        manga?: mongoose.Types.ObjectId;
        chapter?: mongoose.Types.ObjectId;
    }) {
        const notification = await this.notificationModel.create({
          ...data,
          readBy: []
        });
    
        const formattedNotification = await this.notificationModel.findById(notification._id)
          .populate('manga', '_id title coverImg')
          .populate('chapter', '_id number')
          .lean();
    
        data.recipients.forEach(userId => {
          if (this.websocketGateway.isUserOnline(userId.toString())) {
            this.websocketGateway.sendNotificationToUser(
              userId.toString(),
              this.formatNotification(formattedNotification, userId.toString())
            );
          }
        });
    
        return notification;
    }
}