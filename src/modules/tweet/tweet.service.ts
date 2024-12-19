import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  FindOptionsRelations,
  QueryRunner,
  Repository,
} from 'typeorm';
import { Tweet } from './entities/tweet.entity';
import { CreateTweetDto, PaginatedTweet, TweetDto } from './dto/tweet.dto';
import { Errors } from '../../core/constants/errors';
import { User } from '../user/entities/user.entity';
import { PermissionService } from '../permission/permission.service';
import { UserService } from '../user/user.service';
import { GroupService } from '../group/group.service';
import { PermissionType } from '../permission/enums/permission.enum';

@Injectable()
export class TweetService {
  constructor(
    @InjectRepository(Tweet)
    private readonly tweetRepository: Repository<Tweet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => PermissionService))
    private readonly permissionService: PermissionService,
    private readonly userService: UserService,
    private readonly groupService: GroupService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private async getParentTweet(createTweetDto: CreateTweetDto): Promise<Tweet> {
    if (createTweetDto.parentTweetId) {
      const parentTweet: Tweet = await this.tweetRepository.findOne({
        where: { id: createTweetDto.parentTweetId },
      });
      if (!parentTweet) {
        throw new NotFoundException(Errors.Tweet.ParentTweetNotFound);
      }
      return parentTweet;
    }
  }

  private async getTweetAuthor(createTweetDto: CreateTweetDto) {
    const author = await this.userRepository.findOne({
      where: {
        id: createTweetDto.authorId,
      },
    });
    if (!author) {
      throw new NotFoundException(Errors.Tweet.AuthorNotFound);
    }
    return author;
  }

  public async createTweet(createTweetDto: CreateTweetDto): Promise<TweetDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const parentTweet: Tweet = await this.getParentTweet(createTweetDto);
      const author: User = await this.getTweetAuthor(createTweetDto);

      const tweet: Tweet = queryRunner.manager.create(Tweet, {
        ...createTweetDto,
        author: author,
        parentTweet: parentTweet,
      });
      const savedTweet: Tweet = await queryRunner.manager.save(tweet);

      await this.permissionService.addPermissionForAuthor(
        savedTweet,
        author,
        queryRunner,
      );
      await queryRunner.commitTransaction();

      return {
        ...savedTweet,
        authorId: author.id,
        parentTweetId: parentTweet?.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  public async getTweetById(
    id: string,
    relations?: FindOptionsRelations<Tweet>,
  ): Promise<Tweet> {
    const tweet = await this.tweetRepository.findOne({
      where: { id },
      relations,
    });

    if (!tweet) {
      throw new NotFoundException(Errors.Tweet.NotFound);
    }
    return tweet;
  }

  public async updateTweetInheritance(
    tweet: Tweet,
    inheritViewPermissions: boolean,
    inheritEditPermissions: boolean,
    queryRunner: QueryRunner,
  ): Promise<void> {
    tweet.inheritViewPermissions = inheritViewPermissions;
    tweet.inheritEditPermissions = inheritEditPermissions;
    await queryRunner.manager.save(Tweet, tweet);
  }

  public async canEditTweet(userId: string, tweetId: string): Promise<boolean> {
    return await this.permissionService.canEditTweet(userId, tweetId);
  }

  async paginateTweets(
    userId: string,
    limit: number,
    page: number,
  ): Promise<PaginatedTweet> {
    if (limit <= 0) throw new BadRequestException(Errors.Tweet.NegativeLimit);
    if (page <= 0) throw new BadRequestException(Errors.Tweet.NegativePage);
    await this.userService.checkUserExistence(userId);

    const offset: number = (page - 1) * limit;
    const userGroupIds: string[] =
      await this.groupService.getAllGroupIdsForUser(userId);

    const query = `
    WITH RECURSIVE tweet_hierarchy AS (
      -- Base case: Start with tweets
      SELECT t.id, t."parentTweetId", t."inheritViewPermissions"
      FROM tweets t
      WHERE t."inheritViewPermissions" = false

      UNION ALL

      -- Recursive case: Find parent tweets
      SELECT t.id, t."parentTweetId", t."inheritViewPermissions"
      FROM tweets t
      INNER JOIN tweet_hierarchy th ON th.id = t."parentTweetId"
    )
    SELECT DISTINCT t.*
    FROM tweets t
    LEFT JOIN permissions p ON p."tweetId" = t.id
    WHERE (
      -- Explicit permissions
      (p."permittedId" = $1 AND p."permissionType" = $4)
      OR (p."permittedId" = ANY($2) AND p."permissionType" = $4)
      OR (
        -- Inherited permissions
        t."inheritViewPermissions" = true
        AND EXISTS (
          SELECT 1
          FROM tweet_hierarchy th
          INNER JOIN permissions parent_p ON parent_p."tweetId" = th."parentTweetId"
          WHERE parent_p."permissionType" = $4
            AND (parent_p."permittedId" = $1 OR parent_p."permittedId" = ANY($2))
        )
      )
      OR (
        -- Root tweets with inheritViewPermissions = true
        t."inheritViewPermissions" = true
        AND t."parentTweetId" IS NULL
      )
    )
    ORDER BY t."createdAt" DESC
    LIMIT $3 OFFSET $5;
    `;

    const tweets = await this.tweetRepository.query(query, [
      userId, // $1: User ID
      userGroupIds, // $2: Group IDs
      limit + 1, // $3: Limit
      PermissionType.View, // $4: Permission type
      offset, // $5: Offset
    ]);

    const hasNextPage = tweets.length > limit;
    const nodes = hasNextPage ? tweets.slice(0, limit) : tweets;
    return {
      nodes,
      hasNextPage,
    };
  }
}
