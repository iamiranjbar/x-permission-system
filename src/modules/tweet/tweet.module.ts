import { forwardRef, Module } from '@nestjs/common';
import { TweetService } from './tweet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tweet } from './entities/tweet.entity';
import { TweetResolver } from './tweet.resolver';
import { UserModule } from '../user/user.module';
import { PermissionModule } from '../permission/permission.module';

const TweetRepository = TypeOrmModule.forFeature([Tweet]);

@Module({
  imports: [
    TweetRepository,
    UserModule,
    forwardRef(() => PermissionModule)
  ],
  providers: [TweetService, TweetResolver,],
  exports: [TweetRepository, TweetService,],
})
export class TweetModule {}
