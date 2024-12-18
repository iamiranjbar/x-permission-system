import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { TweetService } from './tweet.service';
import { CreateTweetDto, TweetDto } from './dto/tweet.dto';

@Resolver(() => TweetDto)
export class TweetResolver {
  constructor(private readonly tweetService: TweetService) {}

  @Mutation(() => TweetDto)
  async createTweet(
    @Args('input') createTweetDto: CreateTweetDto,
  ): Promise<TweetDto> {
    return await this.tweetService.createTweet(createTweetDto);
  }
}
