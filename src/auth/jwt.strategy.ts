import { User } from 'src/auth/schemas/user.schema';
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
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

    async validate(payload) {
        const { id } = payload;

        if (payload.type) {
            throw new HttpException({
                statusCode: HttpStatus.UNAUTHORIZED,
                message: "Không thể xác thực token",
                code: "AUTH.INVALID_TOKEN"
            }, HttpStatus.UNAUTHORIZED);
        }

        const user = await this.userModel.findById(id)

        if (!user) {
            throw new HttpException({
                statusCode: HttpStatus.UNAUTHORIZED,
                message: "Vui lòng đăng nhập trước khi thực hiện hành động!",
                code: "AUTH.USER_NOT_FOUND"
            }, HttpStatus.UNAUTHORIZED);
        }

        const token = await this.tokenModel.findOne({ user: user._id }).sort({ createdAt: -1}) 

        if (token?.isRevoked) {
            throw new HttpException({
                statusCode: HttpStatus.UNAUTHORIZED,
                message: 'Token đã bị vô hiệu hoá và không còn được sử dụng nữa. Hãy đăng nhập lại!',
                code: "AUTH.TOKEN_REVOKED"
            }, HttpStatus.UNAUTHORIZED);
        }

        return user;
    }
}