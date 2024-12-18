import { IsBoolean, IsArray, IsUUID } from 'class-validator';

export class UpdateTweetPermissionsDto {
  @IsBoolean()
  inheritViewPermissions: boolean;

  @IsBoolean()
  inheritEditPermissions: boolean;

  @IsArray()
  @IsUUID('4', { each: true })
  userViewPermissions: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  groupViewPermissions: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  userEditPermissions: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  groupEditPermissions: string[];
}
