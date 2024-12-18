import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tweet } from './entities/tweet.entity';
import { CreateTweetDto, TweetDto } from './dto/tweet.dto';
import { Errors } from '../../core/constants/errors';
import { User } from '../user/entities/user.entity';
import { PermissionService } from '../permission/permission.service';

@Injectable()
export class TweetService {
  constructor(
    @InjectRepository(Tweet)
    private readonly tweetRepository: Repository<Tweet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => PermissionService))
    private readonly permissionService: PermissionService,
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

    await this.permissionService.addPermissionForAuthor(savedTweet, author);
    return {
      ...savedTweet,
      authorId: author.id,
      parentTweetId: parentTweet?.id,
    };
  }

  public async getTweetById(id: string): Promise<Tweet> {
    const tweet = await this.tweetRepository.findOne({ where: { id: id } });
    if (!tweet) {
      throw new NotFoundException(Errors.Tweet.NotFound);
    }
    return tweet;
  }

  public async updateTweetInheritance(tweet: Tweet, inheritViewPermissions: boolean, inheritEditPermissions: boolean): Promise<Tweet> {
    tweet.inheritViewPermissions = inheritViewPermissions;
    tweet.inheritEditPermissions = inheritEditPermissions;
    return this.tweetRepository.save(tweet);
  }
}
