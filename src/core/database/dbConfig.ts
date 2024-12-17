import { DataSource, DataSourceOptions } from 'typeorm';
import 'src/core/config/env.loader';

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
  entities: ['dist/modules/**/**/*.entity{.js,.ts}'],
  logging: process.env.DB_LOGGING === 'true',
};

export const dataSource = new DataSource(dbConfig);
