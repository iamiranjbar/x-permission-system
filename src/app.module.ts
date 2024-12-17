import { Module } from '@nestjs/common';
import { DatabaseModule } from './core/database/database.module';
import { GraphqlModule } from './core/graphql/graphql.module';
import { GraphQLDateTime } from 'graphql-scalars';

@Module({
  imports: [DatabaseModule, GraphqlModule],
  providers: [
    {
      provide: 'DateTime',
      useValue: GraphQLDateTime,
    },
  ],
})
export class AppModule {}
