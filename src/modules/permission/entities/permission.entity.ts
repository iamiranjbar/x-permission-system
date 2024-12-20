import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tweet } from '../../tweet/entities/tweet.entity';
import { PermissionType, PermittedType } from '../enums/permission.enum';

@Entity('permissions')
@Index(['permittedId', 'permissionType', 'tweetId', 'createdAt'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  permittedId: string;

  @Column({
    type: 'enum',
    enum: PermittedType,
    nullable: false,
  })
  permittedEntityType: PermittedType;

  @ManyToOne(() => Tweet, (tweet) => tweet.permissions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tweetId' })
  tweet: Tweet;

  @Column('uuid')
  tweetId: string;

  @Column({
    type: 'enum',
    enum: PermissionType,
    nullable: false,
  })
  permissionType: PermissionType;

  @CreateDateColumn()
  createdAt: Date;
}
