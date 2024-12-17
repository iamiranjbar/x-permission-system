import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbConfig } from "./dbConfig";

@Module({
  imports: [
    TypeOrmModule.forRoot(dbConfig),
  ],
})
export class DatabaseModule {}
