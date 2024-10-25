import { AuthService } from './auth.service';
import {  Body, Controller, Get, Headers, HttpException, HttpStatus, Param, Post, HttpCode } from '@nestjs/common';
import { SignUpDTO } from './dto/signup.dto';
import { LoginDTO } from './dto/login.dto';
import { ResetPassworDTO } from './dto/reset-password.dto';

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
    async login (@Body() loginDTO: LoginDTO): Promise<{accessToken: string, refreshToken: string}> {
        try {
            return this.authService.login(loginDTO);
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    @Post('/refresh-token')
    async refreshToken (@Headers('Authorization') authorization: string): Promise<{accessToken: string}> {
        try {
            if (!authorization || !authorization.startsWith('Bearer ')) {
                throw new HttpException('Authorization Header không hợp lệ', HttpStatus.BAD_REQUEST)
            }
    
            const refreshToken = authorization.split(' ')[1]
            return this.authService.refreshToken(refreshToken)
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    @Get('email/verify/:email/:token')
    async verifyEmail (@Param('email') email: string ,@Param('token') token: string): Promise<ErrorResponseDTO>{
        try {
            const result = await this.authService.verifyEmail(email, token);

            if (result) {
                return { message: 'Email đã được xác thực thành công', statusCode: HttpStatus.OK };
            } else {
                return { message: 'Xác thực không thành công. Vui lòng kiểm tra mã OTP hoặc thử lại sau', statusCode: HttpStatus.BAD_REQUEST};
            }
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR)
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
