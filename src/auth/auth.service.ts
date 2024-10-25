
import { ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/auth/schemas/user.schema';
import * as bcrypt from 'bcryptjs'
import * as nodemailer from 'nodemailer'
import { JwtService } from '@nestjs/jwt';
import { SignUpDTO } from './dto/signup.dto';
import { LoginDTO } from './dto/login.dto';
import { Token } from './schemas/token.schema';
import { EmailVerification } from './schemas/email-verification.schema';
import { ConfigService } from '@nestjs/config';
import { RefreshToken } from './interface/token.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PasswordReset } from './schemas/password-reset.schema';
import { FogottenPassword } from './interface/resetpassword.interface';

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
        private configService: ConfigService,
        @InjectQueue('email') private readonly emailQueue: Queue,
    ){}

    async signUp (signUpDTO: SignUpDTO): Promise<boolean> {
        const {name, email, password, confirmPassword} = signUpDTO

        if (password !== confirmPassword) {
            throw new UnauthorizedException('REGISTRATION.Mật khẩu không trùng khớp!')
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const savedUser = await this.userModel.create({
            name, 
            email,
            password: hashedPassword,
        })

        if (!savedUser) {
            throw new HttpException ("REGISTRATION.Tạo tài khoản không thành công", HttpStatus.NOT_ACCEPTABLE)
        }


        await this.createEmailToken(savedUser.email)
        await this.emailQueue.add('sendEmailVerification', { email: savedUser.email }, {
            removeOnComplete: true,
            removeOnFail: true
        })

        return true
    }
k
    async login (loginDTO: LoginDTO): Promise<{accessToken: string, refreshToken: string}> {
        
        const { email, password } = loginDTO

        const user = await this.userModel.findOne({ email })

        if (!user) {
            throw new UnauthorizedException("LOGIN.Email hoặc mật khẩu không chính xác!")
        }

        const isPasswordMatched = await bcrypt.compare(password, user.password)

        if (!isPasswordMatched) {
            throw new UnauthorizedException("LOGIN.Email hoặc mật khẩu không chính xác!")
        }

        if (!user.isVerified) {
            throw new HttpException(
                {
                    status: HttpStatus.FORBIDDEN,
                    error: 'Email chưa được xác thực',
                    code: 'USER.NOT_VERIFIED'
                },
                HttpStatus.FORBIDDEN
            )
        }

        const refreshToken = this.jwtService.sign({ id: user._id, email: user.email, type: 'refresh'},{
            secret: process.env.REFRESH_TOKEN_SECRET,
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES
        })

        await this.refreshTokenModel.create({token: refreshToken, user: user._id})

        const accessToken = this.jwtService.sign({ id: user._id, email: user.email })

        return { accessToken, refreshToken }
    }

    async refreshToken (refreshToken: string): Promise<{accessToken: string}>{
        const tokenDoc: RefreshToken = await this.refreshTokenModel.findOne({ token: refreshToken })
        if (!tokenDoc || tokenDoc.isRevoked) {
            throw new UnauthorizedException("LOGIN.Refresh Token không hợp lệ hoặc đã bị thu hồi!")
        }

        const tokenExpires = new Date().getTime() - tokenDoc.createdAt.getTime()
        const expriedTime = 24 * 60 * 60 * 1000

        if (tokenExpires > expriedTime) {
            throw new ForbiddenException("LOGIN.Refresh Token đã hết hạn.")
        }

        const user = await this.userModel.findById(tokenDoc.user.toString())

        if (!user) {
            throw new UnauthorizedException("LOGIN.Người dùng không tồn tại")
        }

        const accessToken = await this.jwtService.sign({id: user._id, email: user.email})
        return { accessToken }
    }

    async sendEmailVerification (email: string): Promise<boolean> {
        const existedEmail = await this.emailVerificationModel.findOne ({ email: email })

        if (existedEmail && existedEmail.emailToken) {
            const transporter = nodemailer.createTransport({
                host: this.configService.get<string>('SMTP_HOST'),
                port: this.configService.get<string>('SMTP_PORT'),
                secure: this.configService.get<boolean>('SMTP_SECURE'),
                auth: {
                    user: this.configService.get<string>('GMAIL_USER'),
                    pass: this.configService.get<string>('GMAIL_PASSWORD')
                }
            })

            const mailOptions = {
                from: `"MangaHybrid Authentication System" <${this.configService.get<string>('GMAIL_USER')}>`,
                to: email,
                subject: 'Verify Email',
                text: 'Verify Email',
                html: `Xin chào! <br><br> Cảm ơn bạn đã đăng ký tài khoản <3<br><br> ${existedEmail.emailToken}`
            }

            const sent = await new Promise<boolean>((resolve, reject) => {
                transporter.sendMail(mailOptions, ( error ) => {
                    if (error) {
                        return reject(false)
                    }
                    resolve(true)
                })
            })
            return sent
        } else {
            throw new HttpException('LOGIN.Tài khoản chưa được đăng ký!', HttpStatus.FORBIDDEN)
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
        const forgottenPassword = await this.passwordResetModel.findOne ({ email: email })  
        if ( forgottenPassword && (( new Date().getTime() - forgottenPassword.timestamp.getTime()) / 60000 < 2)) {
            throw new HttpException("RESET_PASSWORD.Email đã được gửi vui lòng chờ 2p trước khi thực hiện lại", HttpStatus.INTERNAL_SERVER_ERROR)
        } else {
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

    async sendEmailForgottenPassword (email: string): Promise<boolean> {
        const user = await this.userModel.findOne({ email: email })
        if (!user) {
            throw new HttpException('LOGIN.Người dùng không tồn tại', HttpStatus.INTERNAL_SERVER_ERROR)
        }

        const resetToken = await this.createEmailForgottenPasswordToken(email)

        if (resetToken && resetToken.resetToken) {
            const transporter = nodemailer.createTransport({
                host: this.configService.get<string>('SMTP_HOST'),
                port: this.configService.get<string>('SMTP_PORT'),
                secure: this.configService.get<boolean>('SMTP_SECURE'),
                auth: {
                    user: this.configService.get<string>('GMAIL_USER'),
                    pass: this.configService.get<string>('GMAIL_PASSWORD')
                }
            })

            const mailOptions = {
                from: `"MangaHybrid Authentication System" <${this.configService.get<string>('GMAIL_USER')}>`,
                to: email,
                subject: 'Reset Password',
                text: 'Reset Password',
                html: `Xin chào! <br><br> Bạn đã yêu cầu để reset password <3<br><br> ${resetToken.resetToken}`
            }

            const sent = await new Promise<boolean>((resolve, reject) => {
                transporter.sendMail(mailOptions, ( error ) => {
                    if (error) {
                        return reject(false)
                    }
                    resolve(true)
                })
            })
            return sent
        } else {
            throw new HttpException('REGISTRATION.Người dùng chưa được đăng ký!', HttpStatus.FORBIDDEN)
        }
    }

    async setPassword (email: string, newPassword: string): Promise<boolean> {
        const user = await this.userModel.findOne({ email: email })
        if (!user) {
            throw new HttpException('LOGIN.User không tồn tại', HttpStatus.NOT_FOUND)
        }

        user.password = await bcrypt.hash(newPassword, 10)

        await user.save()
        return true
    }
    
}
