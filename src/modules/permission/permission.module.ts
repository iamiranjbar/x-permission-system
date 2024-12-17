import { Module } from '@nestjs/common';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';

const PermissionRepository = TypeOrmModule.forFeature([Permission]);

@Module({
  imports: [PermissionRepository],
  controllers: [PermissionController],
  providers: [PermissionService],
  exports: [PermissionRepository],
})
export class PermissionModule {}
