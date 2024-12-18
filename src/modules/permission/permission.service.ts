import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { Tweet } from '../tweet/entities/tweet.entity';
import { PermissionType, PermittedType } from './enums/permission.enum';
import { UpdateTweetPermissionsDto } from './dto/tweet-permission.dto';
import { TweetService } from '../tweet/tweet.service';
import { User } from '../user/entities/user.entity';
import { GroupService } from '../group/group.service';
import { UserService } from '../user/user.service';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    private readonly userService: UserService,
    private readonly groupService: GroupService,
    @Inject(forwardRef(() => TweetService))
    private readonly tweetService: TweetService,
  ) {}

  async updateTweetPermissions(
    tweetId: string,
    updateTweetPermissionsDto: UpdateTweetPermissionsDto,
  ): Promise<boolean> {
    const tweet: Tweet = await this.tweetService.getTweetById(tweetId);
    await this.tweetService.updateTweetInheritance(
      tweet,
      updateTweetPermissionsDto.inheritViewPermissions,
      updateTweetPermissionsDto.inheritEditPermissions,
    );

    if (!updateTweetPermissionsDto.inheritViewPermissions) {
      await this.updatePermissions(
        tweet,
        updateTweetPermissionsDto.userViewPermissions,
        updateTweetPermissionsDto.groupViewPermissions,
        PermissionType.View,
      );
    }
    if (!updateTweetPermissionsDto.inheritEditPermissions) {
      await this.updatePermissions(
        tweet,
        updateTweetPermissionsDto.userEditPermissions,
        updateTweetPermissionsDto.groupEditPermissions,
        PermissionType.Edit,
      );
    }
    return true;
  }

  private async clearExistingPermissions(
    tweet: Tweet,
    permissionType: PermissionType,
  ): Promise<void> {
    await this.permissionRepository.delete({
      tweet: { id: tweet.id },
      permissionType: permissionType,
    });
  }

  private async createNewPermissions(
    permittedIds: string[],
    permittedType: PermittedType,
    tweet: Tweet,
    permissionType: PermissionType,
  ): Promise<Permission[]> {
    return permittedIds.map((id) =>
      this.permissionRepository.create({
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
  ): Promise<void> {
    await this.groupService.checkIdsValidity(
      permittedUserIds,
      permittedGroupIds,
    );
    await this.clearExistingPermissions(tweet, permissionType);
    const userPermissions: Permission[] = await this.createNewPermissions(
      permittedUserIds,
      PermittedType.User,
      tweet,
      permissionType,
    );
    const groupPermissions: Permission[] = await this.createNewPermissions(
      permittedGroupIds,
      PermittedType.Group,
      tweet,
      permissionType,
    );
    const permissions: Permission[] = [...userPermissions, ...groupPermissions];
    await this.permissionRepository.save(permissions);
  }

  public async addUserPermission(
    tweet: Tweet,
    user: User,
    permissionType: PermissionType,
  ): Promise<void> {
    const userPermission: Permission = this.permissionRepository.create({
      permittedId: user.id,
      permittedEntityType: PermittedType.User,
      tweet,
      permissionType,
    });
    await this.permissionRepository.save(userPermission);
  }

  public async addPermissionForAuthor(
    tweet: Tweet,
    author: User,
  ): Promise<void> {
    await this.addUserPermission(tweet, author, PermissionType.View);
    await this.addUserPermission(tweet, author, PermissionType.Edit);
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
    const userHasEditPermission = await this.permissionRepository.findOne({
      where: {
        tweet: { id: tweetId },
        permissionType: PermissionType.Edit,
        permittedId: userId,
      },
    });

    if (userHasEditPermission) {
      return true;
    }
  }

  private async userHasGroupEditPermission(
    userId: string,
    tweetId: string,
  ): Promise<boolean> {
    // Check if the user belongs to a group with edit permissions
    const userGroupIds = await this.groupService.getAllGroupIdsForUser(userId);
    const groupHasEditPermission = await this.permissionRepository.findOne({
      where: {
        tweet: { id: tweetId },
        permissionType: PermissionType.Edit,
        permittedId: In(userGroupIds),
      },
    });

    return !!groupHasEditPermission;
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
}
