import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

const UserRepository = TypeOrmModule.forFeature([User]);

@Module({
  imports: [UserRepository],
  providers: [UserService],
  exports: [UserRepository, UserService],
})
export class UserModule {}
