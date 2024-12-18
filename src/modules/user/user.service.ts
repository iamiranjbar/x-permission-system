import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';

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
      }
    });
    return existed_counts === ids.length;
  }
}
