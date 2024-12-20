import {
  BadRequestException,
  Inject,
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
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

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
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
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

      // Invalidate caches for affected users and groups
      const affected = await this.getAllAffectedUsersAndGroups([savedGroup.id]);
      await this.invalidateCachesForUsersAndGroups(
        affected.affectedUserIds,
        affected.affectedGroupIds,
      );

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
    const cacheKey: string = `user:${userId}:groupIds`;
    const cachedGroupIds: string[] =
      await this.cacheManager.get<string[]>(cacheKey);
    if (cachedGroupIds) {
      console.log(`Cache hit for for key: ${cacheKey}`);
      return cachedGroupIds;
    }

    console.log(`Cache miss for for key: ${cacheKey}`);
    const directUserGroups = await this.membershipRepository.find({
      where: { memberId: userId },
      relations: ['group'],
    });
    const directGroupIds: string[] = directUserGroups.map(
      (membership: GroupMembership) => membership.group.id,
    );

    const allGroupIds: string[] = await this.getAllGroupIds(directGroupIds);
    await this.cacheManager.set(cacheKey, allGroupIds, 10 * 60 * 1000);
    return allGroupIds;
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

      const cacheKey: string = `group:${currentGroupId}:parentGroupIds`;
      let parentGroupIds: string[] =
        await this.cacheManager.get<string[]>(cacheKey);
      if (parentGroupIds) {
        console.log(`Cache hit for key: ${cacheKey}`);
      } else {
        console.log(`Cache miss for key: ${cacheKey}`);
        const parentGroups: GroupMembership[] =
          await this.membershipRepository.find({
            where: { memberId: currentGroupId },
            relations: ['group'],
          });
        parentGroupIds = parentGroups.map((membership) => membership.group.id);
        await this.cacheManager.set(cacheKey, parentGroupIds, 600 * 1000);
      }
      queue.push(...parentGroupIds);
    }
    return Array.from(visited);
  }

  private async getAllAffectedUsersAndGroups(groupIds: string[]): Promise<{
    affectedUserIds: string[];
    affectedGroupIds: string[];
  }> {
    const visitedGroups = new Set<string>();
    const affectedUserIds = new Set<string>();
    const affectedGroupIds = new Set<string>(groupIds);
    const queue = [...groupIds];

    while (queue.length > 0) {
      const currentGroupId = queue.shift();
      if (visitedGroups.has(currentGroupId)) continue;

      visitedGroups.add(currentGroupId);

      const memberships = await this.membershipRepository.find({
        where: { groupId: currentGroupId },
      });

      memberships.forEach((membership) => {
        if (membership.memberType === MemberType.User) {
          affectedUserIds.add(membership.memberId);
        } else if (membership.memberType === MemberType.Group) {
          affectedGroupIds.add(membership.memberId);
          queue.push(membership.memberId);
        }
      });
    }

    return {
      affectedUserIds: Array.from(affectedUserIds),
      affectedGroupIds: Array.from(affectedGroupIds),
    };
  }

  private async invalidateCachesForUsersAndGroups(
    userIds: string[],
    groupIds: string[],
  ): Promise<void> {
    for (const userId of userIds) {
      await this.cacheManager.del(`user:${userId}:groupIds`);
      console.log(`Cache delete key: user:${userId}:groupIds`);
    }
    for (const groupId of groupIds) {
      await this.cacheManager.del(`group:${groupId}:parentGroupIds`);
      console.log(`Cache delete key: user:${groupId}:parentGroupIds`);
    }
  }
}
