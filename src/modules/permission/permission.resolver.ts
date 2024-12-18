import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { PermissionService } from './permission.service';
import { UpdateTweetPermissionsDto } from './dto/tweet-permission.dto';

@Resolver()
export class PermissionResolver {
  constructor(private readonly permissionService: PermissionService) {}

  @Mutation(() => Boolean)
  async updateTweetPermissions(
    @Args('tweetId') tweetId: string,
    @Args('input') updateTweetPermissionsDto: UpdateTweetPermissionsDto,
  ): Promise<boolean> {
    return this.permissionService.updateTweetPermissions(tweetId, updateTweetPermissionsDto);
  }
}
