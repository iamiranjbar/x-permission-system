import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { TweetService } from './tweet.service';
import {
  CreateTweetDto,
  FilterTweet,
  PaginatedTweet,
  TweetDto,
} from './dto/tweet.dto';

@Resolver(() => TweetDto)
export class TweetResolver {
  constructor(private readonly tweetService: TweetService) {}

  @Mutation(() => TweetDto)
  async createTweet(
    @Args('input') createTweetDto: CreateTweetDto,
  ): Promise<TweetDto> {
    return await this.tweetService.createTweet(createTweetDto);
  }

  @Query(() => Boolean)
  async canEditTweet(
    @Args('userId') userId: string,
    @Args('tweetId') tweetId: string,
  ): Promise<boolean> {
    return await this.tweetService.canEditTweet(userId, tweetId);
  }

  @Query(() => PaginatedTweet)
  async paginateTweets(
    @Args('userId') userId: string,
    @Args('limit') limit: number,
    @Args('page') page: number,
    @Args('filters', { nullable: true }) filters?: FilterTweet,
  ): Promise<PaginatedTweet> {
    return this.tweetService.paginateTweets(userId, limit, page, filters);
  }
}
