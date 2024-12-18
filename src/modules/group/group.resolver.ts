import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { GroupService } from './group.service';
import { Group } from './entities/group.entity';
import { CreateGroupDto, GroupDto } from './dto/group.dto';

@Resolver(() => Group)
export class GroupResolver {
  constructor(private readonly groupService: GroupService) {}

  @Mutation(() => GroupDto)
  async createGroup(@Args('input') createGroupDto: CreateGroupDto): Promise<GroupDto> {
    return await this.groupService.createGroup(createGroupDto);
  }
}
