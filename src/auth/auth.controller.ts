import { AuthService } from './auth.service';
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Param, Post, HttpCode, Res } from '@nestjs/common';
import { SignUpDTO } from './dto/signup.dto';
import { LoginDTO } from './dto/login.dto';
import { ResetPassworDTO } from './dto/reset-password.dto';
import { Platform } from 'src/utils/platform';
import { Response } from 'express';
import { RefreshTokenDTO } from './dto/refreshToken.dto';

@Controller('auth')
export class AuthController {
    constructor ( private authService: AuthService) {}

    @Post('/signup')
    async signUp (@Body() signUpDTO: SignUpDTO): Promise<{message: string}> {
        try {
            const result = await this.authService.signUp(signUpDTO)
            if (result) {
                return { message: 'Đăng ký tài khoản thành công! Vui lòng kiểm tra email để xác thực tài khoản'}
            }
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    @Post('/login')
    async login (
        @Body() loginDTO: LoginDTO, 
        @Headers('x-platform') platform: Platform, 
        @Res({ passthrough: true }) response: Response
    ): Promise<{accessToken?: string, refreshToken?: string, message: string}> 
    {
        try {
            const token = await this.authService.login(loginDTO)

            if (platform === Platform.WEB) {
                response.cookie('access_token', token.accessToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'lax',
                    maxAge: 15 * 60 * 1000
                });
                
                response.cookie('refresh_token', token.refreshToken, {
                    httpOnly: true, 
                    secure: false,
                    sameSite: 'lax',
                    maxAge: 24 * 60 * 60 * 1000
                });

                return { message: 'Đăng nhập thành công' };
            }

            return {
                accessToken: token.accessToken,
                refreshToken: token.refreshToken,
                message: 'Đăng nhập thành công'
            }
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    @Post('/refresh-token')
    async refreshToken(
        @Headers('x-platform') platform: Platform,
        @Body() refreshTokenDto: RefreshTokenDTO,
        @Res({ passthrough: true }) response: Response
    ): Promise<{accessToken?: string, refreshToken?: string, message: string}> {
        try {
            const tokens = await this.authService.refreshToken(refreshTokenDto.refreshToken)

            if (platform === Platform.WEB) {
                
                response.cookie('access_token', tokens.accessToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'lax',
                    maxAge: 15 * 60 * 1000
                });

                response.cookie('refresh_token', tokens.refreshToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'lax',
                    maxAge: 24 * 60 * 60 * 1000
                });

                return { message: 'Token đã được làm mới' };
            }

            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                message: 'Token đã được làm mới'
            };
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


    @Get('email/verify/:email/:token')
    async verifyEmail (@Param('email') email: string ,@Param('token') token: string): Promise<{message: string}>{
        try {
            const user = await this.authService.findUserByEmail(email);
        
        if (!user) {
            throw new HttpException('LOGIN.Tài khoản không tồn tại', HttpStatus.NOT_FOUND);
        }

        if (user.isVerified) {
            throw new HttpException('LOGIN.Tài khoản đã được xác thực', HttpStatus.BAD_REQUEST);
        }

        const result = await this.authService.verifyEmail(email, token);

        if (result) {
            return { message: 'Email đã được xác thực thành công' };
        } else {
                return { message: 'Xác thực không thành công. Vui lòng kiểm tra mã OTP hoặc thử lại sau' };
            }
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('email/forgot-password/:email')
    async sendEmailResetToken (@Param() params): Promise<{message: string}> {
        try {
            const isEmailSent = await this.authService.sendEmailForgottenPassword(params.email)
            if (isEmailSent) {
                return { message: 'Mã xác thực reset password đã được gửi!' }
            } else {
                return { message: 'Mã xác thực reset password chưa được gửi!' }
            }
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    @Get('email/resend-verification/:email')
    async sendEmailVerification (@Param('email') email: string): Promise<{message: string}> {
        try {
            const user = await this.authService.findUserByEmail(email);
        
            if (!user) {
                throw new HttpException('LOGIN.Tài khoản không tồn tại', HttpStatus.NOT_FOUND);
            }

            if (user.isVerified) {
                throw new HttpException('LOGIN.Tài khoản đã được xác thực', HttpStatus.BAD_REQUEST);
            }

            await this.authService.createEmailToken(email)
            const isEmailSent = await this.authService.sendEmailVerification(email)

            if (!isEmailSent) {
                return { message: 'Gửi mail thất bại' }
            } else {
                return { message: 'Email đã được gửi thành công!' }
            }
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR)
        } 
    }

    @Post('/email/reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword (@Body() resetPassword: ResetPassworDTO): Promise<{message: string}> {
        try {
            const forgottendPassword = await this.authService.getForgotPassword(resetPassword.resetToken)
            const isPasswordChanged = await this.authService.setPassword(forgottendPassword.email, resetPassword.password) 
            if (isPasswordChanged) {
                return { message: 'RESET_PASSWORD.Mật khẩu đã được thay đổi' }
            } else {
                return { message: 'RESET_PASSWORD.Thay đổi mật khẩu thất bại' }
            }
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
}
