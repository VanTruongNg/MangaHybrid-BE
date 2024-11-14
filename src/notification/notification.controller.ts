import { Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationResponse } from './interface/notification.res';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Notification')
@Controller('notifications')  
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Lấy tất cả thông báo của người dùng' })
  async getUserNotifications(@Req() req: any): Promise<NotificationResponse[]> {
    return this.notificationService.getUserNotifications(req.user._id);
  }

  @Patch(':id/read')
  @Auth()
  @ApiOperation({ summary: 'Đánh dấu thông báo đã đọc' })
  async markAsRead(
    @Param('id') id: string,
    @Req() req: any
  ) {
    return this.notificationService.markAsRead(id, req.user._id);
  }

  @Patch('mark-all-read')
  @Auth()
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  async markAllAsRead(@Req() req: any) {
    return this.notificationService.markAllAsRead(req.user._id);
  }
}
