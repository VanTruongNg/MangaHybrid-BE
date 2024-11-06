import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: "*",
    methods: '*',
    allowedHeaders: 'Content-Type, Authorization'
  })

  app.use(cookieParser())

  app.setGlobalPrefix('api/v1')

  app.useGlobalPipes(new ValidationPipe())
  await app.listen(3000);
}
bootstrap();
