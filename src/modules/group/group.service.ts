import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { GroupMembership } from './entities/group-membership.entity';
import { CreateGroupDto, GroupDto } from './dto/group.dto';
import { MemberType } from './enums/member_type.enum';
import { Errors } from '../../core/constants/errors';
import { UserService } from '../user/user.service';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMembership)
    private readonly membershipRepository: Repository<GroupMembership>,
    private readonly userService: UserService,
  ) {}

  private async checkIdsValidity(userIds: string[], groupIds: string[]): Promise<void> {
    if (!await this.userService.doAllIdsExists(userIds))
      throw new NotFoundException(Errors.User.IdNotExist);
    if (!await this.doAllIdsExists(groupIds))
      throw new NotFoundException(Errors.Group.IdNotExist);
  }

  private async createGroupMemberships(
    savedGroup: Group,
    userIds: string[],
    groupIds: string[],
  ): Promise<void> {
    const userMemberships: GroupMembership[] = userIds?.map((userId) =>
      this.membershipRepository.create({
        memberId: userId,
        memberType: MemberType.User,
        group: savedGroup,
      }),
    );
    const groupMemberships: GroupMembership[] = groupIds?.map((groupId) =>
      this.membershipRepository.create({
        memberId: groupId,
        memberType: MemberType.Group,
        group: savedGroup,
      }),
    );
    const memberships: GroupMembership[] = [];
    if (userMemberships?.length > 0) memberships.push(...userMemberships);
    if (groupMemberships?.length > 0) memberships.push(...groupMemberships);
    await this.membershipRepository.save(memberships);
  }

  public async createGroup(input: CreateGroupDto): Promise<GroupDto> {
    const { userIds, groupIds } = input;

    if (
      (!userIds || userIds.length === 0) &&
      (!groupIds || groupIds.length === 0)
    ) {
      throw new BadRequestException(Errors.Group.EmptyMembersList);
    }
    await this.checkIdsValidity(userIds, groupIds);

    const group = this.groupRepository.create({
      name: `group-${Date.now()}`,
    });
    const savedGroup = await this.groupRepository.save(group);

    await this.createGroupMemberships(savedGroup, userIds, groupIds);

    const response: GroupDto = { ...savedGroup };
    if (userIds?.length > 0) response['userIds'] = userIds;
    if (groupIds?.length > 0) response['groupIds'] = groupIds;
    return response;
  }

  public async doAllIdsExists(ids: string[]): Promise<boolean> {
    if (!ids || ids.length === 0) return true;
    const existed_counts = await this.groupRepository.count({
      where: {
        id: In(ids),
      }
    });
    return existed_counts === ids.length;
  }
}
