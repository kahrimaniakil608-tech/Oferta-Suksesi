import { PrismaErrorsFilter } from './common/prisma-errors.filter';
import { QueryBoundsPipe } from './common/query-bounds.pipe';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Only honor forwarded client IPs from explicitly configured proxy addresses.
  const trustedProxies = process.env.TRUSTED_PROXY_CIDRS?.split(',').map(value => value.trim()).filter(Boolean);
  if (trustedProxies?.length) app.getHttpAdapter().getInstance().set('trust proxy', trustedProxies);

  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalFilters(new PrismaErrorsFilter());
  app.useGlobalPipes(new QueryBoundsPipe(), new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.setGlobalPrefix('api/v1');

  // Only expose Swagger docs in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Oferta Suksesi API')
      .setDescription('REST API for the Oferta Suksesi classifieds platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    console.log(`Swagger docs at http://localhost:${process.env.API_PORT ?? 3001}/docs`);
  }

  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
