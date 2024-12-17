import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

const UserRepository = TypeOrmModule.forFeature([User]);

@Module({
  imports: [UserRepository],
  exports: [UserRepository],
})
export class UserModule {}
