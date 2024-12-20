import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { Tweet } from '../tweet/entities/tweet.entity';
import { PermissionType, PermittedType } from './enums/permission.enum';
import { UpdateTweetPermissionsDto } from './dto/tweet-permission.dto';
import { TweetService } from '../tweet/tweet.service';
import { User } from '../user/entities/user.entity';
import { GroupService } from '../group/group.service';
import { UserService } from '../user/user.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    private readonly userService: UserService,
    private readonly groupService: GroupService,
    @Inject(forwardRef(() => TweetService))
    private readonly tweetService: TweetService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async updateTweetPermissions(
    tweetId: string,
    updateTweetPermissionsDto: UpdateTweetPermissionsDto,
  ): Promise<boolean> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tweet: Tweet = await this.tweetService.getTweetById(tweetId);
      await this.tweetService.updateTweetInheritance(
        tweet,
        updateTweetPermissionsDto.inheritViewPermissions,
        updateTweetPermissionsDto.inheritEditPermissions,
        queryRunner,
      );

      if (!updateTweetPermissionsDto.inheritViewPermissions) {
        await this.updatePermissions(
          tweet,
          updateTweetPermissionsDto.userViewPermissions,
          updateTweetPermissionsDto.groupViewPermissions,
          PermissionType.View,
          queryRunner,
        );
      }
      if (!updateTweetPermissionsDto.inheritEditPermissions) {
        await this.updatePermissions(
          tweet,
          updateTweetPermissionsDto.userEditPermissions,
          updateTweetPermissionsDto.groupEditPermissions,
          PermissionType.Edit,
          queryRunner,
        );
      }
      await queryRunner.commitTransaction();
      await this.invalidatePermissionCache(tweetId);
      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async clearExistingPermissions(
    tweet: Tweet,
    permissionType: PermissionType,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.delete(Permission, {
      tweet: { id: tweet.id },
      permissionType: permissionType,
    });
  }

  private async createNewPermissions(
    permittedIds: string[],
    permittedType: PermittedType,
    tweet: Tweet,
    permissionType: PermissionType,
    queryRunner: QueryRunner,
  ): Promise<Permission[]> {
    return permittedIds.map((id) =>
      queryRunner.manager.create(Permission, {
        permittedId: id,
        permittedEntityType: permittedType,
        tweet,
        permissionType,
      }),
    );
  }

  private async updatePermissions(
    tweet: Tweet,
    permittedUserIds: string[],
    permittedGroupIds: string[],
    permissionType: PermissionType,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await this.groupService.checkIdsValidity(
      permittedUserIds,
      permittedGroupIds,
    );
    await this.clearExistingPermissions(tweet, permissionType, queryRunner);
    const userPermissions: Permission[] = await this.createNewPermissions(
      permittedUserIds,
      PermittedType.User,
      tweet,
      permissionType,
      queryRunner,
    );
    const groupPermissions: Permission[] = await this.createNewPermissions(
      permittedGroupIds,
      PermittedType.Group,
      tweet,
      permissionType,
      queryRunner,
    );
    const permissions: Permission[] = [...userPermissions, ...groupPermissions];
    await queryRunner.manager.save(Permission, permissions);
  }

  public async addUserPermission(
    tweet: Tweet,
    user: User,
    permissionType: PermissionType,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const userPermission: Permission = queryRunner.manager.create(Permission, {
      permittedId: user.id,
      permittedEntityType: PermittedType.User,
      tweet,
      permissionType,
    });
    await queryRunner.manager.save(userPermission);
  }

  public async addPermissionForAuthor(
    tweet: Tweet,
    author: User,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await this.addUserPermission(
      tweet,
      author,
      PermissionType.View,
      queryRunner,
    );
    await this.addUserPermission(
      tweet,
      author,
      PermissionType.Edit,
      queryRunner,
    );
  }

  private async hasInheritedEditPermission(
    userId: string,
    tweet: Tweet,
  ): Promise<boolean> {
    if (!tweet.parentTweet) {
      // Root-level tweet with inherit option is editable only by author
      return tweet.author.id === userId;
    }

    // Recursive check for parent tweet's permissions
    return await this.canEditTweet(userId, tweet.parentTweet.id);
  }

  private async userHasExplicitEditPermission(
    userId: string,
    tweetId: string,
  ): Promise<boolean> {
    const cacheKey = `permissions:${tweetId}:${userId}:explicit_edit`;
    return await this.getCachedPermission(cacheKey, async () => {
      const userPermission = await this.permissionRepository.findOne({
        where: {
          tweet: { id: tweetId },
          permissionType: PermissionType.Edit,
          permittedId: userId,
        },
      });

      return !!userPermission;
    });
  }

  // private async userHasGroupEditPermission(
  //   userId: string,
  //   tweetId: string,
  // ): Promise<boolean> {
  //   // Check if the user belongs to a group with edit permissions
  //   const userGroupIds = await this.groupService.getAllGroupIdsForUser(userId);
  //   const groupHasEditPermission = await this.permissionRepository.findOne({
  //     where: {
  //       tweet: { id: tweetId },
  //       permissionType: PermissionType.Edit,
  //       permittedId: In(userGroupIds),
  //     },
  //   });
  //
  //   return !!groupHasEditPermission;
  // }

  private async userHasGroupEditPermission(
    userId: string,
    tweetId: string,
  ): Promise<boolean> {
    const cacheKey = `permissions:${tweetId}:${userId}:group_edit`;
    return await this.getCachedPermission(cacheKey, async () => {
      const userGroupIds =
        await this.groupService.getAllGroupIdsForUser(userId);
      const groupPermission = await this.permissionRepository.findOne({
        where: {
          tweet: { id: tweetId },
          permissionType: PermissionType.Edit,
          permittedId: In(userGroupIds),
        },
      });

      return !!groupPermission;
    });
  }

  public async canEditTweet(userId: string, tweetId: string): Promise<boolean> {
    const tweet = await this.tweetService.getTweetById(tweetId, {
      author: true,
      parentTweet: true,
    });
    await this.userService.checkUserExistence(userId);
    if (tweet.inheritEditPermissions) {
      return await this.hasInheritedEditPermission(userId, tweet);
    }

    if (await this.userHasExplicitEditPermission(userId, tweetId)) {
      return true;
    }

    return await this.userHasGroupEditPermission(userId, tweetId);
  }

  private async invalidatePermissionCache(tweetId: string): Promise<void> {
    const keys = await this.cacheManager.store.keys(`permissions:${tweetId}:*`);
    for (const key of keys) {
      await this.cacheManager.del(key);
    }
  }

  private async getCachedPermission(
    cacheKey: string,
    fetchFn: () => Promise<boolean>,
  ): Promise<boolean> {
    const cachedResult = await this.cacheManager.get<boolean>(cacheKey);

    if (cachedResult !== undefined) {
      console.log(`Cache hit for key: ${cacheKey}`);
      return cachedResult;
    }

    console.log(`Cache miss for key: ${cacheKey}`);
    const result = await fetchFn();
    await this.cacheManager.set(cacheKey, result, { ttl: 600 }); // Cache for 10 minutes
    return result;
  }
}
