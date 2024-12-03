import { AuthService } from './auth.service';
import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, HttpCode, Req } from '@nestjs/common';
import { SignUpDTO } from './dto/signup.dto';
import { LoginDTO } from './dto/login.dto';
import { ResetPasswordDTO, VerifyOtpDTO } from './dto/reset-password.dto';
import { RefreshTokenDTO } from './dto/refreshToken.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GoogleLoginDTO } from './dto/google-login.dto';
import { Auth } from './decorators/auth.decorator';
@Controller('auth')
@ApiTags('Auth')
export class AuthController {
    constructor ( private authService: AuthService) {}

    @Post('/signup')
    @ApiOperation({ summary: 'Đăng ký tài khoản' })
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
    @ApiOperation({ summary: 'Đăng nhập tài khoản' })
    async login(
        @Body() loginDTO: LoginDTO
    ): Promise<{ accessToken: string; refreshToken: string; message: string }> {
        try {
            const token = await this.authService.login(loginDTO);
            return {
                accessToken: token.accessToken,
                refreshToken: token.refreshToken,
                message: 'Đăng nhập thành công'
            };
        } catch (error) {
            throw error instanceof HttpException 
                ? error 
                : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/google')
    @ApiOperation({ summary: 'Đăng nhập Google' })
    async googleLogin(
        @Body() googleLoginDTO: GoogleLoginDTO
    ): Promise<{ accessToken: string; refreshToken: string; message: string }> {
        try {
            const token = await this.authService.handleGoogleLogin(googleLoginDTO.accessToken);
            return {
                accessToken: token.accessToken,
                refreshToken: token.refreshToken,
                message: 'Đăng nhập Google thành công'
            };
        } catch (error) {
            throw error instanceof HttpException 
                ? error 
                : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/refresh-token')
    @ApiOperation({ summary: 'Làm mới token' })
    async refreshToken(
        @Body() refreshTokenDto: RefreshTokenDTO
    ): Promise<{ accessToken: string; refreshToken: string; message: string }> {
        try {
            const tokens = await this.authService.refreshToken(refreshTokenDto.refreshToken);
            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                message: 'Token đã được làm mới'
            };
        } catch (error) {
            throw error instanceof HttpException 
                ? error 
                : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('email/verify/:email/:token')
    @ApiOperation({ summary: 'Xác thực email' })
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
    @ApiOperation({ summary: 'Gửi mã xác thực reset password' })
    async sendEmailResetPassword (@Param() params): Promise<{message: string}> {
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
    @ApiOperation({ summary: 'Gửi lại mã xác thực email' })
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

    @Post('/email/verify-reset-token')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xác thực mã OTP reset password' })
    async verifyResetToken(@Body() verifyOtp: VerifyOtpDTO): Promise<{message: string}> {
        try {
            await this.authService.verifyResetToken(verifyOtp.resetToken);
            return { message: 'RESET_PASSWORD.Mã OTP hợp lệ' };
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/email/reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password' })
        async resetPassword(@Body() resetPassword: ResetPasswordDTO): Promise<{message: string}> {
        try {
            if (resetPassword.password !== resetPassword.confirmPassword) {
                throw new HttpException(
                    'RESET_PASSWORD.Mật khẩu mới và mật khẩu xác nhận phải giống nhau!',
                    HttpStatus.BAD_REQUEST
                );
            }
            
            const forgottenPassword = await this.authService.getForgotPassword(resetPassword.resetToken);
            
            if (!forgottenPassword) {
                throw new HttpException('RESET_PASSWORD.Mã OTP không hợp lệ hoặc đã hết hạn', HttpStatus.BAD_REQUEST);
            }

            const isPasswordChanged = await this.authService.setPassword(forgottenPassword.email, resetPassword.password);
            
            if (isPasswordChanged) {
                await forgottenPassword.deleteOne();
                return { message: 'RESET_PASSWORD.Mật khẩu đã được thay đổi thành công' };
            }
            
            return { message: 'RESET_PASSWORD.Thay đổi mật khẩu thất bại' };
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/logout')
    @Auth()
    @ApiOperation({ summary: 'Đăng xuất' })
    async logout(
        @Req() req: any
    ): Promise<{ message: string }> {
        try {
            await this.authService.logout(req.user._id);
            return {
                message: 'Đăng xuất thành công'
            };
        } catch (error) {
            throw error instanceof HttpException 
                ? error 
                : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
