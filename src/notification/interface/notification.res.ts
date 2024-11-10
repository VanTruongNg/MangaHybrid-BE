import { NotificationType } from "../schema/notification.schema";

export interface NotificationResponse {
    id: string;
    type: NotificationType;
    message: string;
    manga?: {
      id: string;
      title: string;
      coverImg: string;
    };
    chapter?: {
      id: string;
      number: number;
    };
    isRead: boolean;
    createdAt: Date;
}