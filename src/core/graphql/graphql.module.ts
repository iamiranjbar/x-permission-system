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
        console.log(error);
        const statusCode = (error.extensions?.originalError as any)?.statusCode;
        return {
          message: error.message,
          code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
          path: error.path,
          statusCode: statusCode,
        };
      },
    }),
  ],
})
export class GraphqlModule {}
