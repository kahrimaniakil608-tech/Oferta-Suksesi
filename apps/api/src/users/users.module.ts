import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PublicUsersController } from './public-users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PublicUsersController, UsersController],
})
export class UsersModule {}
