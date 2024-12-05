import { Controller, Req, Param, Get } from '@nestjs/common';
import { ChatRoomService } from './chat-room.service';
import { Auth } from 'src/auth/decorators/auth.decorator';

@Controller('chat-room')
export class ChatRoomController {
    constructor(private readonly chatRoomService: ChatRoomService) {}

    @Get('private')
    @Auth({ requireVerified: true })
    async getUserRooms(@Req() req: any) {
        const rooms = await this.chatRoomService.getUserPrivateRooms(req.user._id);
        return {
            success: true,
            data: rooms
        };
    }

    @Get(':roomId/messages')
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
