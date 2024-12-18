import { forwardRef, Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { PermissionResolver } from './permission.resolver';
import { TweetModule } from '../tweet/tweet.module';
import { GroupModule } from '../group/group.module';
import { UserModule } from '../user/user.module';

const PermissionRepository = TypeOrmModule.forFeature([Permission]);

@Module({
  imports: [
    PermissionRepository,
    GroupModule,
    forwardRef(() => TweetModule),
    UserModule,
  ],
  providers: [PermissionService, PermissionResolver],
  exports: [PermissionRepository, PermissionService],
})
export class PermissionModule {}
