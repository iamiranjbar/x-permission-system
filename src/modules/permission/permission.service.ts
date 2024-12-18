import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { Tweet } from '../tweet/entities/tweet.entity';
import { PermissionType, PermittedType } from './enums/permission.enum';
import { UpdateTweetPermissionsDto } from './dto/tweet-permission.dto';
import { TweetService } from '../tweet/tweet.service';
import { User } from '../user/entities/user.entity';
import { GroupService } from '../group/group.service';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
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
}
