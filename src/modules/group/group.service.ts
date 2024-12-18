import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { GroupMembership } from './entities/group-membership.entity';
import { CreateGroupDto, GroupDto } from './dto/createGroupDto';
import { MemberType } from './enums/member_type.enum';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMembership)
    private readonly membershipRepository: Repository<GroupMembership>,
  ) {}

  private async createGroupMemberships(savedGroup: Group, userIds: string[], groupIds: string[]): Promise<void> {
    const userMemberships: GroupMembership[] = userIds.map((userId) =>
      this.membershipRepository.create({
        memberId: userId,
        memberType: MemberType.User,
        group: savedGroup,
      }),
    );
    const groupMemberships: GroupMembership[] = groupIds.map((groupId) =>
      this.membershipRepository.create({
        memberId: groupId,
        memberType: MemberType.Group,
        group: savedGroup,
      }),
    );
    await this.membershipRepository.save([...userMemberships, ...groupMemberships]);
  }

  public async createGroup(input: CreateGroupDto): Promise<GroupDto> {
    const { userIds, groupIds } = input;

    const group = this.groupRepository.create({
      name: `group-${Date.now()}`,
    });
    const savedGroup = await this.groupRepository.save(group);

    await this.createGroupMemberships(savedGroup, userIds, groupIds);
    return {
      ...savedGroup,
      userIds: userIds,
      groupIds: groupIds,
    };
  }
}
