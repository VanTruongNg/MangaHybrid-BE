import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: "*",
    methods: '*',
    allowedHeaders: 'Content-Type, Authorization'
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
