import { Module } from '@nestjs/common';
import { TweetController } from './tweet.controller';
import { TweetService } from './tweet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tweet } from './entities/tweet.entity';

const TweetRepository = TypeOrmModule.forFeature([Tweet]);

@Module({
  imports: [TweetRepository],
  controllers: [TweetController],
  providers: [TweetService],
  exports: [TweetRepository],
})
export class TweetModule {}
