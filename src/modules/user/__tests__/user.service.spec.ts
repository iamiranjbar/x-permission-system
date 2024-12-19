import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { In, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { NotFoundException } from '@nestjs/common';

describe('UserService', () => {
  let userService: UserService;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('doAllIdsExists', () => {
    it('should return true if no IDs are provided', async () => {
      const result = await userService.doAllIdsExists([]);
      expect(result).toBe(true);
      expect(userRepository.count).not.toHaveBeenCalled();
    });

    it('should return true if all IDs exist', async () => {
      const ids = ['id1', 'id2'];
      userRepository.count.mockResolvedValue(ids.length);

      const result = await userService.doAllIdsExists(ids);
      expect(result).toBe(true);
      expect(userRepository.count).toHaveBeenCalledWith({
        where: { id: In(ids) },
      });
    });

    it('should return false if some IDs are missing', async () => {
      const ids = ['id1', 'id2', 'id3'];
      userRepository.count.mockResolvedValue(2);

      const result = await userService.doAllIdsExists(ids);
      expect(result).toBe(false);
      expect(userRepository.count).toHaveBeenCalledWith({
        where: { id: In(ids) },
      });
    });
  });

  describe('checkUserExistence', () => {
    it('should not throw an error if the user exists', async () => {
      const id = 'user1';
      userRepository.findOne.mockResolvedValue({ id } as User);

      await expect(userService.checkUserExistence(id)).resolves.not.toThrow();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should throw NotFoundException if the user does not exist', async () => {
      const id = 'user1';
      userRepository.findOne.mockResolvedValue(null);

      await expect(userService.checkUserExistence(id)).rejects.toThrow(
        NotFoundException,
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id },
      });
    });
  });
});
