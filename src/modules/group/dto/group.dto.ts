import { OmitType } from '@nestjs/mapped-types';
import { IsArray, IsDate, IsOptional, IsUUID } from 'class-validator';

export class GroupDto {
  id: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  groupIds?: string[];

  @IsDate()
  createdAt: Date;

  @IsOptional()
  name?: string;
}

export class CreateGroupDto extends OmitType(GroupDto, [
  'id',
  'createdAt',
  'name',
]) {}
