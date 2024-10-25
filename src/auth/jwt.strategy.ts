import { User } from 'src/auth/schemas/user.schema';
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from 'passport-jwt'
import { Model } from "mongoose";
import { Token } from './schemas/token.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel(Token.name) private readonly tokenModel: Model<Token>
    ) {
        super ({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET
        })
    }

    async validate (payload) {
        const { id } = payload;

        if (payload.type) {
            throw new UnauthorizedException("Không thể xác thực token")
        }

        const user = await this.userModel.findById(id)

        if (!user) {
            throw new UnauthorizedException("Vui lòng đăng nhập trước khi thực hiện hành dộng!")
        }

        const token = await this.tokenModel.findOne({ user: user._id }).sort({ createdAt: -1}) 

        if ( token?.isRevoked ) {
            throw new UnauthorizedException('Token đã bị vô hiệu hoá và không còn được sử dụng nữa. Hãy đăng nhập lại!')
        }

        return user
    }
}