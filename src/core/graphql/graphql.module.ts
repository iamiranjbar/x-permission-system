import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLError } from 'graphql/error';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: ['src/core/graphql/*.graphql'],
      playground: true,
      formatError: (error: GraphQLError) => {
        const originalError = error.extensions?.originalError as any;
        return {
          message: originalError?.message,
          code: originalError?.error || 'INTERNAL_SERVER_ERROR',
          path: error.path,
          statusCode: originalError?.statusCode,
        };
      },
    }),
  ],
})
export class GraphqlModule {}
