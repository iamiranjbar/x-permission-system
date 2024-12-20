import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { GroupMembership } from './group-membership.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 200, nullable: false, unique: true })
  name: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => GroupMembership, (membership) => membership.group, {
    cascade: true,
  })
  members: GroupMembership[];
}
