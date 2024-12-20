import { Module } from '@nestjs/common';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import 'src/core/config/env.loader';

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: async () => {
        const store = await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT, 10) || 6379,
          },
        });

        return {
          store: store as unknown as CacheStore,
          ttl: parseInt(process.env.REDIS_TTL, 10) || 300,
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
