import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // ─── Static file serving for /uploads/* ──────────────────────────────────
  const uploadDir = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve('./uploads');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  app.useStaticAssets(uploadDir, {
    prefix: '/uploads',
    setHeaders: (res, filePath) => {
      if (/\.(webp|jpg|jpeg|png|gif)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        // Ensure images display inline in browser instead of downloading
        res.setHeader('Content-Disposition', 'inline');
      }
    },
  });

  // ─── Swagger ──────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Oferta Suksesi — Image Service')
    .setDescription('Image upload, processing and serving')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.IMAGE_SERVICE_PORT ?? 4001;
  await app.listen(port);
  console.log(`Image service running on http://localhost:${port}`);
  console.log(`Static files served at http://localhost:${port}/uploads`);
  console.log(`Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
