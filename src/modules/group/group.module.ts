import { Module } from '@nestjs/common';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';

const GroupRepository = TypeOrmModule.forFeature([Group]);

@Module({
  imports: [GroupRepository],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupRepository],
})
export class GroupModule {}
