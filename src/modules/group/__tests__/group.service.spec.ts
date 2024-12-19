import { Test, TestingModule } from '@nestjs/testing';
import { GroupService } from '../group.service';
import { Repository, DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Group } from '../entities/group.entity';
import { GroupMembership } from '../entities/group-membership.entity';
import { UserService } from '../../user/user.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Errors } from '../../../core/constants/errors';

describe('GroupService', () => {
  let service: GroupService;
  let groupRepository: Repository<Group>;
  let membershipRepository: Repository<GroupMembership>;
  let userService: UserService;
  let dataSourceMock: DataSource;
  let queryRunnerMock: any;

  beforeEach(async () => {
    queryRunnerMock = {
      manager: {
        create: jest.fn(),
        save: jest.fn(),
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
        GroupService,
        {
          provide: getRepositoryToken(Group),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(GroupMembership),
          useClass: Repository,
        },
        {
          provide: UserService,
          useValue: {
            doAllIdsExists: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    service = module.get<GroupService>(GroupService);
    groupRepository = module.get<Repository<Group>>(getRepositoryToken(Group));
    membershipRepository = module.get<Repository<GroupMembership>>(
      getRepositoryToken(GroupMembership),
    );
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(groupRepository).toBeDefined();
    expect(membershipRepository).toBeDefined();
    expect(userService).toBeDefined();
    expect(dataSourceMock).toBeDefined();
  });

  describe('checkIdsValidity', () => {
    it('should throw NotFoundException if user IDs do not exist', async () => {
      jest.spyOn(userService, 'doAllIdsExists').mockResolvedValue(false);

      await expect(
        service.checkIdsValidity(['nonexistent-user'], []),
      ).rejects.toThrow(NotFoundException);
      expect(userService.doAllIdsExists).toHaveBeenCalledWith([
        'nonexistent-user',
      ]);
    });

    it('should throw NotFoundException if group IDs do not exist', async () => {
      jest.spyOn(userService, 'doAllIdsExists').mockResolvedValue(true);
      jest.spyOn(service, 'doAllIdsExists').mockResolvedValue(false);

      await expect(
        service.checkIdsValidity([], ['nonexistent-group']),
      ).rejects.toThrow(NotFoundException);
      expect(service.doAllIdsExists).toHaveBeenCalledWith([
        'nonexistent-group',
      ]);
    });

    it('should pass if all user and group IDs exist', async () => {
      jest.spyOn(userService, 'doAllIdsExists').mockResolvedValue(true);
      jest.spyOn(service, 'doAllIdsExists').mockResolvedValue(true);

      await expect(service.checkIdsValidity(['user1'], ['group1'])).resolves.not
        .toThrow;
    });
  });

  describe('createGroup', () => {
    it('should create a group with valid userIds and groupIds', async () => {
      jest.spyOn(service, 'checkIdsValidity').mockResolvedValue(undefined);

      queryRunnerMock.manager.create.mockReturnValueOnce({
        id: 'group-id',
        name: 'group-name',
        createdAt: new Date(),
      });

      queryRunnerMock.manager.save.mockResolvedValueOnce({
        id: 'group-id',
        name: 'group-name',
        createdAt: new Date(),
      });

      queryRunnerMock.manager.save.mockResolvedValueOnce(undefined);

      const result = await service.createGroup({
        userIds: ['user1'],
        groupIds: ['group1'],
      });

      expect(queryRunnerMock.connect).toHaveBeenCalledTimes(1);
      expect(queryRunnerMock.startTransaction).toHaveBeenCalledTimes(1);

      expect(queryRunnerMock.manager.create).toHaveBeenCalledWith(Group, {
        name: expect.stringContaining('group-'),
      });

      expect(queryRunnerMock.manager.save).toHaveBeenCalled();

      expect(result).toEqual({
        id: 'group-id',
        name: 'group-name',
        createdAt: expect.any(Date),
        userIds: ['user1'],
        groupIds: ['group1'],
      });

      expect(queryRunnerMock.commitTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunnerMock.release).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException if both userIds and groupIds are empty', async () => {
      await expect(
        service.createGroup({ userIds: [], groupIds: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if userIds contain non-existent users', async () => {
      jest
        .spyOn(service, 'checkIdsValidity')
        .mockRejectedValue(new NotFoundException(Errors.User.IdNotExist));

      await expect(
        service.createGroup({ userIds: ['invalid-user'], groupIds: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should rollback transaction if an error occurs', async () => {
      jest.spyOn(service, 'checkIdsValidity').mockResolvedValue(undefined);

      queryRunnerMock.manager.save.mockRejectedValueOnce(
        new Error('Database error'),
      );

      await expect(
        service.createGroup({ userIds: ['user1'], groupIds: ['group1'] }),
      ).rejects.toThrow('Database error');

      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunnerMock.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('doAllIdsExists', () => {
    it('should return true if all ids exist', async () => {
      jest.spyOn(groupRepository, 'count').mockResolvedValue(3);

      const result = await service.doAllIdsExists(['id1', 'id2', 'id3']);
      expect(result).toBe(true);
    });

    it('should return false if some ids do not exist', async () => {
      jest.spyOn(groupRepository, 'count').mockResolvedValue(2);

      const result = await service.doAllIdsExists(['id1', 'id2', 'id3']);
      expect(result).toBe(false);
    });
  });

  describe('getAllGroupIdsForUser', () => {
    it('should return all group ids for a user', async () => {
      // Mock the direct user groups
      jest
        .spyOn(membershipRepository, 'find')
        .mockResolvedValue([
          { group: { id: 'group1' } } as GroupMembership,
          { group: { id: 'group2' } } as GroupMembership,
        ]);

      // Mock the recursive call to getAllGroupIds
      const getAllGroupIdsSpy = jest
        .spyOn(service, 'getAllGroupIds' as any) // Explicitly typecast private method access if needed
        .mockResolvedValue(['group1', 'group2', 'group3']);

      // Call the method under test
      const result = await service.getAllGroupIdsForUser('user1');

      // Assertions
      expect(membershipRepository.find).toHaveBeenCalledWith({
        where: { memberId: 'user1' },
        relations: ['group'],
      });
      expect(getAllGroupIdsSpy).toHaveBeenCalledWith(['group1', 'group2']);
      expect(result).toEqual(['group1', 'group2', 'group3']);
    });

    it('should return an empty list if the user belongs to no groups', async () => {
      // Mock the direct user groups as empty
      jest.spyOn(membershipRepository, 'find').mockResolvedValue([]);

      // Call the method under test
      const result = await service.getAllGroupIdsForUser('user1');

      // Assertions
      expect(membershipRepository.find).toHaveBeenCalledWith({
        where: { memberId: 'user1' },
        relations: ['group'],
      });
      expect(result).toEqual([]);
    });
  });
});
