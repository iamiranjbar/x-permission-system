import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { GroupService } from './group.service';
import { Group } from './entities/group.entity';
import { CreateGroupDto, GroupDto } from './dto/createGroupDto';

@Resolver(() => Group)
export class GroupResolver {
  constructor(private readonly groupService: GroupService) {}

  @Mutation(() => GroupDto)
  async createGroup(
    @Args('input') input: CreateGroupDto,
  ): Promise<GroupDto> {
    return await this.groupService.createGroup(input);
  }
}