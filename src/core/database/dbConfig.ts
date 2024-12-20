import { DataSource, DataSourceOptions } from 'typeorm';
import 'src/core/config/env.loader';
import { User } from '../../modules/user/entities/user.entity';
import { Group } from '../../modules/group/entities/group.entity';
import { GroupMembership } from '../../modules/group/entities/group-membership.entity';
import { Tweet } from '../../modules/tweet/entities/tweet.entity';
import { Permission } from '../../modules/permission/entities/permission.entity';

export const dbConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'permission_system',
  synchronize: process.env.DB_SYNC === 'true',
  migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
  migrations: ['dist/core/database/migrations/**/*.js'],
  entities: [User, Group, GroupMembership, Tweet, Permission],
  logging: process.env.DB_LOGGING === 'true',
};

export const dataSource = new DataSource(dbConfig);
