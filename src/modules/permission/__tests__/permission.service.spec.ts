import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from '../permission.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { GroupService } from '../../group/group.service';
import { TweetService } from '../../tweet/tweet.service';
import { UserService } from '../../user/user.service';
import { Tweet } from '../../tweet/entities/tweet.entity';
import { User } from '../../user/entities/user.entity';
import { PermissionType } from '../enums/permission.enum';
import { NotFoundException } from '@nestjs/common';

describe('PermissionService', () => {
  let service: PermissionService;
  let permissionRepository: Repository<Permission>;
  let groupService: GroupService;
  let tweetService: TweetService;
  let userService: UserService;
  let dataSourceMock: DataSource;
  let queryRunnerMock: any;

  beforeEach(async () => {
    queryRunnerMock = {
      manager: {
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
        findOne: jest.fn(),
      },
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };

    dataSourceMock = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunnerMock),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: getRepositoryToken(Permission),
          useClass: Repository,
        },
        {
          provide: GroupService,
          useValue: {
            checkIdsValidity: jest.fn(),
            getAllGroupIdsForUser: jest.fn(),
          },
        },
        {
          provide: TweetService,
          useValue: {
            getTweetById: jest.fn(),
            updateTweetInheritance: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            checkUserExistence: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    permissionRepository = module.get<Repository<Permission>>(
      getRepositoryToken(Permission),
    );
    groupService = module.get<GroupService>(GroupService);
    tweetService = module.get<TweetService>(TweetService);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(permissionRepository).toBeDefined();
    expect(groupService).toBeDefined();
    expect(tweetService).toBeDefined();
    expect(userService).toBeDefined();
    expect(dataSourceMock).toBeDefined();
  });

  describe('canEditTweet', () => {
    it('should return true if the user has explicit edit permission', async () => {
      jest.spyOn(tweetService, 'getTweetById').mockResolvedValue({
        id: 'tweet1',
        inheritEditPermissions: false,
      } as Tweet);
      jest
        .spyOn(userService, 'checkUserExistence')
        .mockResolvedValue(undefined);
      jest.spyOn(permissionRepository, 'findOne').mockResolvedValue({
        id: 'permission1',
        permittedId: 'user1',
        permissionType: PermissionType.Edit,
        tweet: { id: 'tweet1' } as Tweet,
      } as Permission);

      const result = await service.canEditTweet('user1', 'tweet1');

      expect(result).toBe(true);
      expect(permissionRepository.findOne).toHaveBeenCalledWith({
        where: {
          tweet: { id: 'tweet1' },
          permissionType: PermissionType.Edit,
          permittedId: 'user1',
        },
      });
    });

    it('should return false if the user has no explicit or group edit permission', async () => {
      jest.spyOn(tweetService, 'getTweetById').mockResolvedValue({
        id: 'tweet1',
        inheritEditPermissions: false,
      } as Tweet);
      jest
        .spyOn(userService, 'checkUserExistence')
        .mockResolvedValue(undefined);

      jest.spyOn(permissionRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(groupService, 'getAllGroupIdsForUser').mockResolvedValue([]);

      const result = await service.canEditTweet('user1', 'tweet1');

      expect(result).toBe(false);
    });

    it('should recursively check for inherited permissions', async () => {
      const parentTweet = {
        id: 'tweet2',
        inheritEditPermissions: false,
        author: { id: 'user1' },
      } as Tweet;

      const childTweet = {
        id: 'tweet1',
        inheritEditPermissions: true,
        parentTweet,
      } as Tweet;

      jest
        .spyOn(tweetService, 'getTweetById')
        .mockImplementation(async (tweetId) => {
          if (tweetId === 'tweet1') return childTweet;
          if (tweetId === 'tweet2') return parentTweet;
          throw new NotFoundException();
        });

      jest
        .spyOn(userService, 'checkUserExistence')
        .mockResolvedValue(undefined);
      jest
        .spyOn(permissionRepository, 'findOne')
        .mockImplementation(async () => {
          return {
            id: 'permission1',
            permittedId: 'user1',
            permissionType: PermissionType.Edit,
            tweet: parentTweet,
          } as Permission;
        });

      const result = await service.canEditTweet('user1', 'tweet1');

      expect(result).toBe(true);
      expect(tweetService.getTweetById).toHaveBeenCalledWith('tweet1', {
        author: true,
        parentTweet: true,
      });
      expect(tweetService.getTweetById).toHaveBeenCalledWith('tweet2', {
        author: true,
        parentTweet: true,
      });
      expect(permissionRepository.findOne).toHaveBeenCalledTimes(1);
      expect(permissionRepository.findOne).toHaveBeenCalledWith({
        where: {
          tweet: { id: 'tweet2' },
          permissionType: PermissionType.Edit,
          permittedId: 'user1',
        },
      });
    });
  });

  describe('updateTweetPermissions', () => {
    it('should update permissions and commit transaction', async () => {
      const tweet = { id: 'tweet1' } as Tweet;
      jest.spyOn(tweetService, 'getTweetById').mockResolvedValue(tweet);
      jest
        .spyOn(tweetService, 'updateTweetInheritance')
        .mockResolvedValue(undefined);
      jest.spyOn(groupService, 'checkIdsValidity').mockResolvedValue(undefined);
      queryRunnerMock.manager.save.mockResolvedValue(undefined);

      const result = await service.updateTweetPermissions('tweet1', {
        inheritViewPermissions: false,
        inheritEditPermissions: false,
        userViewPermissions: ['user1'],
        groupViewPermissions: ['group1'],
        userEditPermissions: ['user2'],
        groupEditPermissions: ['group2'],
      });

      expect(queryRunnerMock.connect).toHaveBeenCalled();
      expect(queryRunnerMock.startTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.release).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should rollback transaction on error', async () => {
      jest
        .spyOn(tweetService, 'getTweetById')
        .mockRejectedValue(new Error('Error'));

      await expect(
        service.updateTweetPermissions('tweet1', {
          inheritViewPermissions: false,
          inheritEditPermissions: false,
          userViewPermissions: [],
          groupViewPermissions: [],
          userEditPermissions: [],
          groupEditPermissions: [],
        }),
      ).rejects.toThrow('Error');

      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.release).toHaveBeenCalled();
    });
  });

  describe('addPermissionForAuthor', () => {
    it('should add view and edit permissions for the author', async () => {
      const tweet = { id: 'tweet1' } as Tweet;
      const user = { id: 'user1' } as User;

      jest.spyOn(service, 'addUserPermission').mockResolvedValue(undefined);

      await service.addPermissionForAuthor(tweet, user, queryRunnerMock);

      expect(service.addUserPermission).toHaveBeenCalledWith(
        tweet,
        user,
        PermissionType.View,
        queryRunnerMock,
      );
      expect(service.addUserPermission).toHaveBeenCalledWith(
        tweet,
        user,
        PermissionType.Edit,
        queryRunnerMock,
      );
    });
  });
});
