import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: function (origin, callback) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: process.env.ALLOWED_METHODS.split(','),
    allowedHeaders: process.env.ALLOWED_HEADERS.split(','),
    credentials: true,
    exposedHeaders: ['Set-Cookie', 'set-cookie']
  })

  const config = new DocumentBuilder()
    .setTitle('Manga API')
    .setDescription('API documentation cho ứng dụng đọc truyện manga')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.use(cookieParser())

  app.setGlobalPrefix('api/v1')

  app.useGlobalPipes(new ValidationPipe())
  await app.listen(3000);
}
bootstrap();
