import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('NotificationService');
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000'],
    credentials: true,
  });

  const port = process.env.NOTIFICATION_SERVICE_PORT ?? 3003;
  await app.listen(port);
  logger.log(`Notification service running on http://localhost:${port}`);
}

bootstrap();
