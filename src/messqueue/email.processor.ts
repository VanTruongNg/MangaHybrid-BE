import { Process, Processor } from '@nestjs/bull';
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Job } from "bull";
import { Model } from "mongoose";
import { EmailVerification } from "src/auth/schemas/email-verification.schema";
import * as nodemailer from 'nodemailer'
import { PasswordReset } from "src/auth/schemas/password-reset.schema";

@Processor('email')
@Injectable()
export class EmailProcessor {
    constructor(
        @InjectModel(EmailVerification.name) private readonly emailVerificationModel: Model<EmailVerification>,
        @InjectModel(PasswordReset.name) private readonly passwordResetModel: Model<PasswordReset>,
        private readonly configService: ConfigService
    ){}

    private async sendEmail(to: string, subject: string, html: string): Promise<void> {
        try {
            const transporter = nodemailer.createTransport({
                host: this.configService.get<string>('SMTP_HOST'),
                port: this.configService.get<string>('SMTP_PORT'),
                secure: this.configService.get<boolean>('SMTP_SECURE'),
                auth: {
                    user: this.configService.get<string>('GMAIL_USER'),
                    pass: this.configService.get<string>('GMAIL_PASSWORD'),
                },
            });
            
            const mailOptions = {
                from: `"MangaHybrid Authentication System" <${this.configService.get<string>('GMAIL_USER')}>`,
                to,
                subject,
                html,
            };

            await new Promise<void>((resolve, reject) => {
                transporter.sendMail(mailOptions, (error) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve();
                });
            });
        } catch (error) {
            throw error;
        }
    }

    @Process('sendEmailVerification')
    async process(job: Job): Promise<boolean> {
        try {
            const { email, type, name } = job.data;

            let token: string;
            let html: string;
            let subject: string;
    
            switch (type) {
                case 'verification':
                    const emailVerification = await this.emailVerificationModel.findOne({ email });
                    if (!emailVerification?.emailToken) {
                        throw new Error('Tài khoản chưa được đăng ký!');
                    }
                    token = emailVerification.emailToken;
                    subject = 'Xác thực Email';
                    html = `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2>Xin chào ${name || ''}!</h2>
                            <p>Cảm ơn bạn đã đăng ký tài khoản.</p>
                            <p>Mã OTP xác thực email của bạn là: <strong style="font-size: 20px; color: #4CAF50;">${token}</strong></p>
                            <p>Mã có hiệu lực trong vòng 15 phút.</p>
                            <hr>
                            <p style="color: #666;">Email này được gửi tự động, vui lòng không trả lời.</p>
                        </div>
                    `;
                    break;
    
                case 'resetPassword':
                    const passwordReset = await this.passwordResetModel.findOne({ email });
                    if (!passwordReset?.resetToken) {
                        throw new Error('Không tìm thấy yêu cầu reset password!');
                    }
                    token = passwordReset.resetToken;
                    subject = 'Reset Password';
                    html = `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2>Xin chào ${name || ''}!</h2>
                            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                            <p>Mã OTP để reset password của bạn là: <strong style="font-size: 20px; color: #4CAF50;">${token}</strong></p>
                            <p>Mã có hiệu lực trong vòng 15 phút.</p>
                            <p>Nếu bạn không yêu cầu reset password, vui lòng bỏ qua email này.</p>
                            <hr>
                            <p style="color: #666;">Email này được gửi tự động, vui lòng không trả lời.</p>
                        </div>
                    `;
                    break;
    
                default:
                    throw new Error('Loại email không hợp lệ!');
            }
    
            await this.sendEmail(email, subject, html);
            console.log('Email job completed successfully');
            return true;
        } catch (error) {
            console.error('Error processing email job:', error);
            throw error;
        }       
    }
}