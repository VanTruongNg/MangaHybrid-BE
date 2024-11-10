import { Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationResponse } from './interface/notification.res';
import { Auth } from 'src/auth/decorators/auth.decorator';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Auth()
  async getUserNotifications(@Req() req: any): Promise<NotificationResponse[]> {
    return this.notificationService.getUserNotifications(req.user._id);
  }

  @Patch(':id/read')
  @Auth()
  async markAsRead(
    @Param('id') id: string,
    @Req() req: any
  ) {
    return this.notificationService.markAsRead(id, req.user._id);
  }

  @Patch('mark-all-read')
  @Auth()
  async markAllAsRead(@Req() req: any) {
    return this.notificationService.markAllAsRead(req.user._id);
  }
}
