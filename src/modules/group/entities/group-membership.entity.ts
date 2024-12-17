import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Group } from './group.entity';
import { MemberType } from '../../../common/enums/member_type.enum';

@Entity('group_memberships')
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

  @ManyToOne(() => Group, (group) => group.members, { onDelete: 'CASCADE' }) // Relationship to the group
  group: Group;
}
