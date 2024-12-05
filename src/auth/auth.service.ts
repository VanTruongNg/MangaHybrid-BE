import { ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/auth/schemas/user.schema';
import * as bcrypt from 'bcryptjs'
import { JwtService } from '@nestjs/jwt';
import { SignUpDTO } from './dto/signup.dto';
import { LoginDTO } from './dto/login.dto';
import { Token } from './schemas/token.schema';
import { EmailVerification } from './schemas/email-verification.schema';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PasswordReset } from './schemas/password-reset.schema';
import { FogottenPassword } from './interface/resetpassword.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel(Token.name)
        private readonly refreshTokenModel: Model<Token>,
        @InjectModel(EmailVerification.name)
        private readonly emailVerificationModel: Model<EmailVerification>,
        @InjectModel(PasswordReset.name)
        private readonly passwordResetModel: Model<PasswordReset>,
        private readonly jwtService: JwtService,
        @InjectQueue('email') private readonly emailQueue: Queue,
        private readonly configService: ConfigService
    ){}

    async signUp(signUpDTO: SignUpDTO): Promise<boolean> {
        const { name, email, password, confirmPassword } = signUpDTO;
    
        if (password !== confirmPassword) {
            throw new UnauthorizedException('REGISTRATION.Mật khẩu không trùng khớp!');
        }
    
        const existingUser = await this.userModel.findOne({ email });
        if (existingUser) {
            throw new HttpException('REGISTRATION.Email đã được sử dụng!', HttpStatus.CONFLICT);
        }
    
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await this.userModel.create({
            name,
            email,
            password: hashedPassword,
        });
    
        if (!user) {
            throw new HttpException("REGISTRATION.Tạo tài khoản không thành công", HttpStatus.NOT_ACCEPTABLE);
        }
    
        const emailToken = await this.createEmailToken(email);
        if (!emailToken) {
            await user.deleteOne();
            throw new HttpException('REGISTRATION.To mã xác thực thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    
        try {
            await this.emailQueue.add('sendEmailVerification', {
                email,
                type: 'verification',
                name
            }, {
                removeOnComplete: true,
                removeOnFail: true,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            });
            
            return true;
        } catch (error) {
            await user.deleteOne();
            await this.emailVerificationModel.findOneAndDelete({ email });
            throw new HttpException('REGISTRATION.Gửi email xác thực thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async login(loginDTO: LoginDTO, deviceId: string): Promise<{accessToken: string, refreshToken: string}> {
        const { email, password } = loginDTO;
        const user = await this.userModel.findOne({ email });
        
        if (!user) {
            throw new UnauthorizedException("LOGIN.Email hoặc mật khẩu không chính xác!");
        }

        const isPasswordMatched = await bcrypt.compare(password, user.password);
        if (!isPasswordMatched) {
            throw new UnauthorizedException("LOGIN.Email hoặc mật khẩu không chính xác!");
        }

        const refreshToken = this.jwtService.sign(
            { id: user._id, email: user.email, type: 'refresh', deviceId },
            {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES')
            }
        );

        await this.refreshTokenModel.create({
            token: refreshToken,
            user: user._id,
            deviceId,
            expiresAt: new Date(
                Date.now() + 
                parseInt(this.configService.get<string>('REFRESH_TOKEN_EXPIRATION'))
            )
        });

        const accessToken = this.jwtService.sign(
            { id: user._id, email: user.email },
            {
                secret: this.configService.get<string>('JWT_SECRET'),
                expiresIn: this.configService.get<string>('JWT_EXPIRES')
            }
        );

        return { accessToken, refreshToken };
    }

    async handleGoogleLogin(accessToken: string, deviceId: string): Promise<{accessToken: string, refreshToken: string}> {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
    
            if (!response.ok) {
                throw new UnauthorizedException('Token Google không hợp lệ');
            }
    
            const userData = await response.json();
    
            let user = await this.userModel.findOne({ email: userData.email });
            
            if (user) {
                if (!user.isVerified || user.provider !== 'google') {
                    user.isVerified = true;
                    user.provider = 'google';
                    user.avatarUrl = userData.picture;
                    await user.save();
                }
            } else {
                user = await this.userModel.create({
                    email: userData.email,
                    name: userData.name,
                    avatarUrl: userData.picture,
                    isVerified: true,
                    provider: 'google'
                });
            }
    
            const refreshToken = this.jwtService.sign(
                { id: user._id, email: user.email, type: 'refresh', deviceId },
                {
                    secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                    expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES')
                }
            );
    
            await this.refreshTokenModel.create({
                token: refreshToken,
                user: user._id,
                deviceId,
                expiresAt: new Date(Date.now() + 24*60*60*1000)
            });
    
            const newAccessToken = this.jwtService.sign({ id: user._id, email: user.email });

            return { accessToken: newAccessToken, refreshToken };
        } catch (error) {
            console.error('Google login error:', error);
            throw error instanceof HttpException 
                ? error 
                : new HttpException('LOGIN.Đăng nhập Google thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async findUserByEmail(email: string): Promise<User> {
        return await this.userModel.findOne({ email });
    }

    async refreshToken(refreshToken: string, deviceId: string): Promise<{accessToken: string, refreshToken: string}> {
        if (!deviceId) {
            throw new UnauthorizedException("LOGIN.Device ID không được để trống!");
        }

        const tokenDoc = await this.refreshTokenModel.findOne({ 
            token: refreshToken,
            deviceId: deviceId
        });
        
        if (!tokenDoc || tokenDoc.isRevoked) {
            throw new UnauthorizedException("LOGIN.Refresh Token không hợp lệ hoặc đã bị thu hồi!");
        }

        if (new Date() > tokenDoc.expiresAt) {
            throw new ForbiddenException("LOGIN.Refresh Token đã hết hạn.");
        }

        const user = await this.userModel.findById(tokenDoc.user);
        if (!user) {
            throw new UnauthorizedException("LOGIN.Người dùng không tồn tại");
        }

        const newRefreshToken = this.jwtService.sign(
            { id: user._id, email: user.email, type: 'refresh', deviceId },
            {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES')
            }
        );

        await this.refreshTokenModel.findOneAndUpdate(
            { token: refreshToken },
            {
                token: newRefreshToken,
                expiresAt: new Date(
                    Date.now() + 
                    parseInt(this.configService.get<string>('REFRESH_TOKEN_EXPIRATION'))
                )
            }
        );

        const accessToken = this.jwtService.sign(
            { id: user._id, email: user.email },
            {
                secret: this.configService.get<string>('JWT_SECRET'),
                expiresIn: this.configService.get<string>('JWT_EXPIRES')
            }
        );

        return { accessToken, refreshToken: newRefreshToken };
    }

    async sendEmailVerification(email: string): Promise<boolean> {
        const existedEmail = await this.emailVerificationModel.findOne({ email: email });
    
        if (existedEmail && existedEmail.emailToken) {
            const user = await this.userModel.findOne({ email });
            if (!user) {
                throw new HttpException('LOGIN.Không tìm thấy User', HttpStatus.NOT_FOUND);
            }
    
            await this.emailQueue.add('sendEmailVerification', {
                email,
                type: 'verification',
                name: user.name
            }, {
                removeOnComplete: true,
                removeOnFail: true,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            });
    
            return true;
        } else {
            throw new HttpException('LOGIN.Tài khoản chưa được đăng ký!', HttpStatus.FORBIDDEN);
        }
    }

    async createEmailToken (email: string): Promise<boolean> {
        const emailVerification = await this.emailVerificationModel.findOne ({ email: email })
        if ( emailVerification && ( ( new Date().getTime() - emailVerification.timestamp.getTime()) / 60000 < 2)) {
            throw new HttpException('LOGIN.Email đã được gửi vui lòng chờ 2p trước khi thực hiện lại!', HttpStatus.INTERNAL_SERVER_ERROR)
        } else {
            const emailVerificationModel = await this.emailVerificationModel.findOneAndUpdate (
                { email: email },
                {
                    email: email,
                    emailToken: ( Math.floor(Math.random() * (900000)) + 100000).toString(),
                    timestamp: new Date()
                },
                {
                    upsert: true,
                    new: true
                }
            )
            if (emailVerificationModel) {
                return true
            } else {
                throw new HttpException('LOGIN.Tạo Verify Token thất bại!', HttpStatus.INTERNAL_SERVER_ERROR)
            }
        }
    }

    async createEmailForgottenPasswordToken (email: string): Promise<FogottenPassword> {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new HttpException('LOGIN.Người dùng không tồn tại', HttpStatus.NOT_FOUND);
        }

        const forgottenPassword = await this.passwordResetModel.findOne ({ email: email })  
        if (forgottenPassword && ((new Date().getTime() - forgottenPassword.timestamp.getTime()) / 60000 < 2)) {
            throw new HttpException(
                'RESET_PASSWORD.Vui lòng chờ 2 phút trước khi gửi lại mã OTP',
                HttpStatus.TOO_MANY_REQUESTS
            );
        }
            
        const forgottenPasswordModel = await this.passwordResetModel.findOneAndUpdate( {
            email: email
        }, {
            email: email,
            resetToken: ( Math.floor(Math.random() * (900000)) + 100000 ).toString(),
            timestamp: new Date()
        }, {
            upsert: true,
            new: true
        })
        if (forgottenPasswordModel) {
            return forgottenPasswordModel
        } else {
            throw new HttpException('RESET_PASSWORD.Tạo Reset Password Token thất bại!', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    async verifyEmail (email: string, token: string): Promise<boolean> {
        const emailVerify = await this.emailVerificationModel.findOne ( { email: email, emailToken: token })
        if (!emailVerify) {
            throw new HttpException ("LOGIN.OTP không hợp lệ!", HttpStatus.FORBIDDEN)
        }

        const user = await this.userModel.findOne ({ email: emailVerify.email })
        if (!user) {
            throw new HttpException ("LOGIN.Không tìm thấy User", HttpStatus.FORBIDDEN)
        }

        user.isVerified = true
        const savedUser = await user.save()
        await emailVerify.deleteOne()
        return !!savedUser
    }

    async getForgotPassword (token: string): Promise<FogottenPassword> {
        return await this.passwordResetModel.findOne({ resetToken: token })
    }

    async sendEmailForgottenPassword(email: string): Promise<boolean> {
    try {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new HttpException('LOGIN.Người dùng không tồn tại', HttpStatus.NOT_FOUND);
        }

        const resetToken = await this.createEmailForgottenPasswordToken(email);
        if (!resetToken?.resetToken) {
            throw new HttpException(
                'RESET_PASSWORD.Tạo mã OTP thất bại',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }

        await this.emailQueue.add('sendEmailVerification', {
            email,
            type: 'resetPassword',
            name: user.name
        }, {
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        });

        return true;
    } catch (error) {
        console.error('Error in sendEmailForgottenPassword:', error);
        throw error instanceof HttpException 
            ? error 
            : new HttpException(
                'RESET_PASSWORD.Không thể gửi email reset password',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async verifyResetToken(resetToken: string): Promise<boolean> {
        const forgottenPassword = await this.passwordResetModel.findOne({ resetToken });
        
        if (!forgottenPassword) {
            throw new HttpException('RESET_PASSWORD.Mã OTP không hợp lệ hoặc đã hết hạn', HttpStatus.BAD_REQUEST);
        }
    
        return true;
    }

    async setPassword(email: string, newPassword: string): Promise<boolean> {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new HttpException('LOGIN.User không tồn tại', HttpStatus.NOT_FOUND);
        }

        const isMatchOldPassword = await bcrypt.compare(newPassword, user.password);
        if (isMatchOldPassword) {
            throw new HttpException(
                'RESET_PASSWORD.Mật khẩu mới không được trùng với mật khẩu cũ',
                HttpStatus.BAD_REQUEST
            );
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        return true;
    }

    async logout(userId: string, deviceId: string): Promise<void> {
        try {
            await this.refreshTokenModel.findOneAndUpdate(
                { user: userId, deviceId },
                { isRevoked: true },
                { sort: { createdAt: -1 } }
            );
        } catch (error) {
            throw new HttpException('Lỗi khi đăng xuất', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
