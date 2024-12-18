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
  inheritViewPermissions: boolean;

  @IsBoolean()
  @IsOptional()
  inheritEditPermissions?: boolean;
}

export class CreateTweetDto extends OmitType(TweetDto, ['id', 'createdAt']) {}
