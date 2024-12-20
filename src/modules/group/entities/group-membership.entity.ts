import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { MemberType } from '../enums/member_type.enum';

@Entity('group_memberships')
@Index(['memberId', 'groupId'])
export class GroupMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column('uuid', { nullable: false })
  memberId: string;

  @Column({
    nullable: false,
    type: 'varchar',
    length: 50,
    enum: MemberType,
  })
  memberType: MemberType;

  @ManyToOne(() => Group, (group) => group.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column('uuid')
  groupId: string;
}
