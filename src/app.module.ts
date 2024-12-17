import { Module } from '@nestjs/common';
import { DatabaseModule } from './core/database/database.module';
import { GraphqlModule } from './core/graphql/graphql.module';
import { GraphQLDateTime } from 'graphql-scalars';
import { GroupModule } from './modules/group/group.module';
import { TweetModule } from './modules/tweet/tweet.module';
import { PermissionModule } from './modules/permission/permission.module';
import { UserModule } from './modules/user/user.module';

@Module({
  // imports: [DatabaseModule, GraphqlModule, GroupModule, TweetModule, PermissionModule, UserModule],
  imports: [DatabaseModule, GraphqlModule, UserModule],
  providers: [
    {
      provide: 'DateTime',
      useValue: GraphQLDateTime,
    },
  ],
})
export class AppModule {}
