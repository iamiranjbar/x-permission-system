import { Module } from '@nestjs/common';
import { GroupService } from './group.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { GroupMembership } from './entities/group-membership.entity';
import { GroupResolver } from './group.resolver';
import { UserModule } from '../user/user.module';
import { RedisCacheModule } from '../../core/cache/cache.module';

const GroupRepositories = TypeOrmModule.forFeature([Group, GroupMembership]);

@Module({
  imports: [GroupRepositories, UserModule, RedisCacheModule],
  providers: [GroupService, GroupResolver],
  exports: [GroupRepositories, GroupService],
})
export class GroupModule {}
