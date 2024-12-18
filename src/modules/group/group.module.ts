import { Module } from '@nestjs/common';
import { GroupService } from './group.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { GroupMembership } from './entities/group-membership.entity';
import { GroupResolver } from './group.resolver';

const GroupRepositories = TypeOrmModule.forFeature([Group, GroupMembership]);

@Module({
  imports: [GroupRepositories],
  providers: [GroupService, GroupResolver],
  exports: [GroupRepositories],
})
export class GroupModule {}
