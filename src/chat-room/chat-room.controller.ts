import { Controller, Req, Param, Get } from '@nestjs/common';
import { ChatRoomService } from './chat-room.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Chat Room')
@Controller('chat-room')
export class ChatRoomController {
    constructor(private readonly chatRoomService: ChatRoomService) {}

    @Get('private')
    @Auth({ requireVerified: true })
    @ApiOperation({ summary: 'Lấy danh sách phòng chat riêng tư của người dùng' })
    async getUserRooms(@Req() req: any) {
        const rooms = await this.chatRoomService.getUserPrivateRooms(req.user._id);
        return {
            success: true,
            data: rooms
        };
    }

    @Get(':roomId/messages')
    @Auth({ requireVerified: true })
    @ApiOperation({ summary: 'Lấy tin nhắn của phòng chat riêng tư' })
    async getRoomMessages(
        @Req() req: any,
        @Param('roomId') roomId: string
    ) {
        const messages = await this.chatRoomService.getPrivateMessages(
            roomId,
            req.user._id
        );
        return {
            success: true,
            data: messages
        };
    }
}
