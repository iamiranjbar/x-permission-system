import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsDate,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { TweetCategory } from '../enums/tweet-category.enum';
import { OmitType } from '@nestjs/mapped-types';
export class TweetDto {
  id: string;

  @IsDate()
  createdAt: Date;

  @IsUUID()
  authorId: string;

  @IsString()
  content: string;

  @IsArray()
  @IsOptional()
  hashtags?: string[];

  @IsUUID()
  @IsOptional()
  parentTweetId?: string;

  @IsEnum(TweetCategory)
  @IsOptional()
  category?: TweetCategory;

  @IsString()
  @IsOptional()
  location?: string;

  @IsBoolean()
  @IsOptional()
  inheritViewPermissions?: boolean;

  @IsBoolean()
  @IsOptional()
  inheritEditPermissions?: boolean;
}

import { Tweet } from '../entities/tweet.entity';

export class CreateTweetDto extends OmitType(TweetDto, ['id', 'createdAt']) {}

export class PaginatedTweet {
  nodes: Tweet[];
  hasNextPage: boolean;
}

export class FilterTweet {
  authorId?: string;
  hashtag?: string;
  parentTweetId?: string;
  category?: TweetCategory;
  location?: string;
}
