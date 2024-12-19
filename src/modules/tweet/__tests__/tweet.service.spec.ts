import { Test, TestingModule } from '@nestjs/testing';
import { TweetService } from '../tweet.service';
import { PermissionService } from '../../permission/permission.service';
import { UserService } from '../../user/user.service';
import { GroupService } from '../../group/group.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { Tweet } from '../entities/tweet.entity';
import { User } from '../../user/entities/user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PermissionType } from '../../permission/enums/permission.enum';

describe('TweetService', () => {
  let tweetService: TweetService;
  let tweetRepository: Repository<Tweet>;
  let userRepository: Repository<User>;
  let permissionService: jest.Mocked<PermissionService>;
  let userService: jest.Mocked<UserService>;
  let groupService: jest.Mocked<GroupService>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TweetService,
        {
          provide: getRepositoryToken(Tweet),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: PermissionService,
          useValue: {
            addPermissionForAuthor: jest.fn(),
            canEditTweet: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            checkUserExistence: jest.fn(),
          },
        },
        {
          provide: GroupService,
          useValue: {
            getAllGroupIdsForUser: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
          },
        },
      ],
    }).compile();

    tweetService = module.get<TweetService>(TweetService);
    tweetRepository = module.get<Repository<Tweet>>(getRepositoryToken(Tweet));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    permissionService = module.get(PermissionService) as jest.Mocked<PermissionService>;
    userService = module.get(UserService) as jest.Mocked<UserService>;
    groupService = module.get(GroupService) as jest.Mocked<GroupService>;
    dataSource = module.get(DataSource) as jest.Mocked<DataSource>;

    queryRunner = {
      manager: {
        create: jest.fn(),
        save: jest.fn(),
      },
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    } as unknown as jest.Mocked<QueryRunner>;

    dataSource.createQueryRunner.mockReturnValue(queryRunner);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTweet', () => {
    it('should successfully create a tweet', async () => {
      const createTweetDto = { authorId: 'user1', parentTweetId: 'tweet1', content: 'Hello' };
      const author = { id: 'user1' } as User;
      const parentTweet = { id: 'tweet1' } as Tweet;
      const savedTweet = { id: 'tweet2', content: 'Hello' } as Tweet;

      jest.spyOn(tweetRepository, 'findOne').mockResolvedValueOnce(parentTweet)
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(author);

      (queryRunner.manager.create as jest.Mock).mockReturnValue(savedTweet);
      (queryRunner.manager.save as jest.Mock).mockResolvedValue(savedTweet);

      const result = await tweetService.createTweet(createTweetDto);

      expect(tweetRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: createTweetDto.parentTweetId },
      });
      expect(userRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: createTweetDto.authorId },
      });
      expect(queryRunner.manager.create).toHaveBeenCalledWith(Tweet, {
        ...createTweetDto,
        author,
        parentTweet,
      });
      expect(permissionService.addPermissionForAuthor).toHaveBeenCalledWith(
        savedTweet,
        author,
        queryRunner,
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual({
        ...savedTweet,
        authorId: author.id,
        parentTweetId: parentTweet.id,
      });
    });


    it('should rollback transaction if an error occurs', async () => {
      const createTweetDto = { authorId: 'user1', content: 'Hello' };

      jest.spyOn(userRepository, 'findOne').mockImplementation(() => {
        throw new Error('Parent tweet error');
      });

      await expect(tweetService.createTweet(createTweetDto)).rejects.toThrow('Parent tweet error');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getTweetById', () => {
    it('should return a tweet by ID', async () => {
      const tweet = { id: 'tweet1', content: 'Hello' } as Tweet;

      jest.spyOn(tweetRepository, 'findOne').mockResolvedValue(tweet);

      const result = await tweetService.getTweetById('tweet1');

      expect(tweetRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'tweet1' },
        relations: undefined,
      });
      expect(result).toEqual(tweet);
    });

    it('should throw NotFoundException if tweet does not exist', async () => {
      jest.spyOn(tweetRepository, 'findOne').mockResolvedValue(null);

      await expect(tweetService.getTweetById('tweet1')).rejects.toThrow(NotFoundException);
    });
  });
  describe('paginateTweets', () => {
    it('should return paginated tweets', async () => {
      const userId = 'user1';
      const limit = 10;
      const page = 1;
      const groupIds = ['group1', 'group2'];
      const tweets = [
        { id: 'tweet1', content: 'Hello' },
        { id: 'tweet2', content: 'World' },
      ];

      groupService.getAllGroupIdsForUser.mockResolvedValue(groupIds);
      userService.checkUserExistence.mockResolvedValue(undefined);
      jest.spyOn(tweetRepository, 'query').mockResolvedValue(tweets);

      const result = await tweetService.paginateTweets(userId, limit, page);
      console.log(result)
      expect(userService.checkUserExistence).toHaveBeenCalledWith(userId);
      expect(groupService.getAllGroupIdsForUser).toHaveBeenCalledWith(userId);
      expect(tweetRepository.query).toHaveBeenCalledWith(expect.stringContaining('WITH RECURSIVE'), [
        userId,
        groupIds,
        limit + 1,
        PermissionType.View,
        0,
      ]);
      expect(result).toEqual({
        nodes: tweets,
        hasNextPage: false,
      });
    });

    it('should return tweets without next page if results are within limit', async () => {
      const userId = 'user1';
      const limit = 10;
      const page = 1;
      const groupIds = ['group1', 'group2'];
      const tweets = [{ id: 'tweet1', content: 'Hello' }];

      groupService.getAllGroupIdsForUser.mockResolvedValue(groupIds);
      userService.checkUserExistence.mockResolvedValue(undefined);
      jest.spyOn(tweetRepository, 'query').mockResolvedValue(tweets);

      const result = await tweetService.paginateTweets(userId, limit, page);

      expect(result).toEqual({
        nodes: tweets,
        hasNextPage: false,
      });
    });

    it('should throw BadRequestException for negative limit', async () => {
      await expect(tweetService.paginateTweets('user1', -1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative page', async () => {
      await expect(tweetService.paginateTweets('user1', 10, -1)).rejects.toThrow(BadRequestException);
    });

    it('should check user existence', async () => {
      const userId = 'user1';
      const limit = 10;
      const page = 1;

      userService.checkUserExistence.mockResolvedValue(undefined);
      groupService.getAllGroupIdsForUser.mockResolvedValue([]);
      jest.spyOn(tweetRepository, 'query').mockResolvedValue([]);

      await tweetService.paginateTweets(userId, limit, page);

      expect(userService.checkUserExistence).toHaveBeenCalledWith(userId);
    });
  });

});
