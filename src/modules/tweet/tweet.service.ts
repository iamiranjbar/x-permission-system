import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tweet } from './entities/tweet.entity';
import { CreateTweetDto, TweetDto } from './dto/tweet.dto';
import { Errors } from '../../core/constants/errors';
import { User } from '../user/entities/user.entity';

@Injectable()
export class TweetService {
  constructor(
    @InjectRepository(Tweet)
    private readonly tweetRepository: Repository<Tweet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
      }
    });
    if (!author) {
      throw new NotFoundException(Errors.Tweet.AuthorNotFound);
    }
    return author;
  }

  public async createTweet(createTweetDto: CreateTweetDto): Promise<TweetDto> {
    const parentTweet: Tweet = await this.getParentTweet(createTweetDto);
    const author: User = await this.getTweetAuthor(createTweetDto);

    const tweet: Tweet = this.tweetRepository.create({
      ...createTweetDto,
      author: author,
      parentTweet: parentTweet,
    });
    const savedTweet = await this.tweetRepository.save(tweet);
    return {
      ...savedTweet,
      authorId: author.id,
      parentTweetId: parentTweet?.id,
    };
  }
}
