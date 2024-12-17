import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { TweetCategory } from '../enums/tweet-category.enum';

@Entity('tweets')
export class Tweet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column('text', { nullable: false })
  content: string;

  @Column('text', { array: true, nullable: true })
  hashtags: string[];

  @ManyToOne(() => Tweet, { nullable: true })
  @JoinColumn({ name: 'parentTweetId' })
  parentTweet?: Tweet;

  @Column({
    type: 'enum',
    enum: TweetCategory,
    nullable: true,
  })
  category?: TweetCategory;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })

  @Column({ type: 'boolean', default: true })
  inheritViewPermissions: boolean;

  @Column({ type: 'boolean', default: true })
  inheritEditPermissions: boolean;
}
