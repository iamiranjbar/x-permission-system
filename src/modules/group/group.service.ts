import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
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
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  public async checkIdsValidity(
    userIds: string[],
    groupIds: string[],
  ): Promise<void> {
    if (!(await this.userService.doAllIdsExists(userIds)))
      throw new NotFoundException(Errors.User.IdNotExist);
    if (!(await this.doAllIdsExists(groupIds)))
      throw new NotFoundException(Errors.Group.IdNotExist);
  }

  private async createGroupMemberships(
    savedGroup: Group,
    userIds: string[],
    groupIds: string[],
    queryRunner: QueryRunner,
  ): Promise<void> {
    const userMemberships: GroupMembership[] = userIds?.map((userId) =>
      queryRunner.manager.create(GroupMembership, {
        memberId: userId,
        memberType: MemberType.User,
        group: savedGroup,
      }),
    );
    const groupMemberships: GroupMembership[] = groupIds?.map((groupId) =>
      queryRunner.manager.create(GroupMembership, {
        memberId: groupId,
        memberType: MemberType.Group,
        group: savedGroup,
      }),
    );
    const memberships: GroupMembership[] = [];
    if (userMemberships?.length > 0) memberships.push(...userMemberships);
    if (groupMemberships?.length > 0) memberships.push(...groupMemberships);
    await queryRunner.manager.save(GroupMembership, memberships);
  }

  public async createGroup(createGroupDto: CreateGroupDto): Promise<GroupDto> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { userIds, groupIds } = createGroupDto;

      if (
        (!userIds || userIds.length === 0) &&
        (!groupIds || groupIds.length === 0)
      ) {
        throw new BadRequestException(Errors.Group.EmptyMembersList);
      }
      await this.checkIdsValidity(userIds, groupIds);

      const group = queryRunner.manager.create(Group, {
        name: `group-${Date.now()}`,
      });
      const savedGroup = await queryRunner.manager.save(group);

      await this.createGroupMemberships(
        savedGroup,
        userIds,
        groupIds,
        queryRunner,
      );
      await queryRunner.commitTransaction();

      const response: GroupDto = { ...savedGroup };
      if (userIds?.length > 0) response['userIds'] = userIds;
      if (groupIds?.length > 0) response['groupIds'] = groupIds;
      return response;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  public async doAllIdsExists(ids: string[]): Promise<boolean> {
    if (!ids || ids.length === 0) return true;
    const existed_counts = await this.groupRepository.count({
      where: {
        id: In(ids),
      },
    });
    return existed_counts === ids.length;
  }

  public async getAllGroupIdsForUser(userId: string): Promise<string[]> {
    const directUserGroups = await this.membershipRepository.find({
      where: { memberId: userId },
      relations: ['group'],
    });
    const directGroupIds = directUserGroups.map(
      (membership) => membership.group.id,
    );

    return await this.getAllGroupIds(directGroupIds);
  }

  private async getAllGroupIds(groupIds: string[]): Promise<string[]> {
    const visited: Set<string> = new Set<string>();
    const queue: string[] = [...groupIds];

    while (queue.length > 0) {
      const currentGroupId: string = queue.shift();
      if (visited.has(currentGroupId)) {
        continue;
      }
      visited.add(currentGroupId);

      // Find parent groups for the current group
      const parentGroups: GroupMembership[] =
        await this.membershipRepository.find({
          where: { memberId: currentGroupId },
          relations: ['group'],
        });

      const parentGroupIds: string[] = parentGroups.map(
        (membership) => membership.group.id,
      );
      queue.push(...parentGroupIds);
    }
    return Array.from(visited);
  }
}
