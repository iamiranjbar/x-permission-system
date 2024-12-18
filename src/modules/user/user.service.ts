import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Tweet } from '../tweet/entities/tweet.entity';
import { Errors } from '../../core/constants/errors';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  public async doAllIdsExists(ids: string[]): Promise<boolean> {
    if (!ids || ids.length === 0) return true;
    const existed_counts = await this.userRepository.count({
      where: {
        id: In(ids),
      },
    });
    return existed_counts === ids.length;
  }

  public async checkUserExistence(id: string): Promise<void> {
    const user: User = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(Errors.User.NotFound);
    }
  }
}
