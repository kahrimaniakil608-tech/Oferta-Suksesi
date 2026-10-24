import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { EmailService } from './email.service';
import { EventListenerService } from './event-listener.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] })],
  controllers: [AppController],
  providers: [PrismaService, EmailService, EventListenerService],
})
export class AppModule {}
