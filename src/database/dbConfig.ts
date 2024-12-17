import { DataSource, DataSourceOptions } from "typeorm";

export const dbConfig: DataSourceOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'permission_system',
  synchronize: false,
  migrationsRun: true,
  migrations: ['src/database/migrations/**/*.ts'],
  entities: ['/src/modules/**/*.entity{.ts,.js}'],
  logging: false,
}

export const dataSource = new DataSource(dbConfig);
