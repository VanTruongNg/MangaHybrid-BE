import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Job } from "bullmq";
import { Model } from "mongoose";
import { EmailVerification } from "src/auth/schemas/email-verification.schema";
import * as nodemailer from 'nodemailer'

@Processor('email')
@Injectable()
export class EmailProcessor extends WorkerHost  {
    constructor(
        @InjectModel(EmailVerification.name) private readonly emailVerificationModel: Model<EmailVerification>,
        private readonly configService: ConfigService
    ){
      super()
    }

    async process(job: Job) {
      if (job.name === 'sendEmailVerification') {
        const { email } = job.data;
        const emailVerification = await this.emailVerificationModel.findOne({ email });
  
        if (emailVerification && emailVerification.emailToken) {
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
            to: email,
            subject: 'Verify Email',
            text: 'Verify Email',
            html: `Xin chào! <br><br> Cảm ơn bạn đã đăng ký tài khoản <3<br><br> ${emailVerification.emailToken}`,
          };
  
          await new Promise<void>((resolve, reject) => {
            transporter.sendMail(mailOptions, (error) => {
              if (error) {
                return reject(error);
              }
              resolve();
            });
          });
        } else {
          throw new Error('Tài khoản chưa được đăng ký!');
        }
      }
    }
}
