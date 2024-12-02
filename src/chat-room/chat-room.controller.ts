import { Controller, HttpStatus, HttpException, Post, Req, Body, Param, Get } from '@nestjs/common';
import { ChatRoomService } from './chat-room.service';
import { Auth } from 'src/auth/decorators/auth.decorator';

@Controller('chat-room')
export class ChatRoomController {
    constructor(private readonly chatRoomService: ChatRoomService) {}

    @Post('private')
    @Auth({ requireVerified: true })
    async createPrivateRoom(
        @Req() req: any,
        @Body('participants') participants: string[]
    ) {
        if (!participants?.length) {
            throw new HttpException('participants is required', HttpStatus.BAD_REQUEST);
        }

        if (!participants.includes(req.user._id)) {
            participants.push(req.user);
        }

        const room = await this.chatRoomService.createPrivateRoom(participants);
        return {
            success: true,
            data: room
        };
    }

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
