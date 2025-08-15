import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CronJobManagerService } from './cron-job-manager.service';
import { NotificationService } from './notification.service';
import { DatabaseService } from '../config/database.service';
import { CronJobModel } from '../models/cron-job.model';
import { CreateCronJobDto } from '../dto/create-cron-job.dto';
import { UpdateCronJobDto } from '../dto/update-cron-job.dto';

describe('CronJobManagerService', () => {
    let service: CronJobManagerService;
    let configService: ConfigService;
    let notificationService: NotificationService;
    let databaseService: DatabaseService;
    let cronJobModel: CronJobModel;

    const mockConfigService = {
        get: jest.fn((key: string) => {
            const config = {
                USE_CLUSTER: 'false',
                NODE_ENV: 'test',
            };
            return config[key];
        }),
    };

    const mockNotificationService = {
        notify: jest.fn().mockResolvedValue(undefined),
    };

    const mockDatabaseService = {
        getRedisClient: jest.fn().mockResolvedValue(null),
    };

    const mockCronJobModel = {
        create: jest.fn(),
        findById: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CronJobManagerService,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: NotificationService,
                    useValue: mockNotificationService,
                },
                {
                    provide: DatabaseService,
                    useValue: mockDatabaseService,
                },
                {
                    provide: CronJobModel,
                    useValue: mockCronJobModel,
                },
            ],
        }).compile();

        service = module.get<CronJobManagerService>(CronJobManagerService);
        configService = module.get<ConfigService>(ConfigService);
        notificationService = module.get<NotificationService>(NotificationService);
        databaseService = module.get<DatabaseService>(DatabaseService);
        cronJobModel = module.get<CronJobModel>(CronJobModel);

        await service.onModuleInit();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createCronJob', () => {
        it('should create a cron job successfully', async () => {
            const createDto: CreateCronJobDto = {
                uri: 'http://localhost:3001/webhook',
                httpMethod: 'POST',
                body: 'Test message',
                schedule: '*/5 * * * *',
                timeZone: 'UTC',
            };

            const mockCronJob = {
                id: '123',
                ...createDto,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                nextRun: new Date(),
            };

            mockCronJobModel.create.mockReturnValue(mockCronJob);

            const result = await service.createCronJob(createDto);

            expect(result).toBeDefined();
            expect(result.uri).toBe(createDto.uri);
            expect(result.httpMethod).toBe(createDto.httpMethod);
            expect(result.schedule).toBe(createDto.schedule);
            expect(mockCronJobModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    uri: createDto.uri,
                    httpMethod: createDto.httpMethod,
                    schedule: createDto.schedule,
                    timeZone: createDto.timeZone,
                    isActive: true,
                }),
            );
        });

        it('should throw error for invalid cron expression', async () => {
            const createDto: CreateCronJobDto = {
                uri: 'http://localhost:3001/webhook',
                httpMethod: 'POST',
                schedule: 'invalid-cron',
                timeZone: 'UTC',
            };

            await expect(service.createCronJob(createDto)).rejects.toThrow(
                'Invalid CRON expression',
            );
        });
    });

    describe('updateCronJob', () => {
        it('should update a cron job successfully', async () => {
            const updateDto: UpdateCronJobDto = {
                id: '123',
                uri: 'http://localhost:3001/webhook-updated',
                schedule: '*/10 * * * *',
            };

            const existingJob = {
                id: '123',
                uri: 'http://localhost:3001/webhook',
                httpMethod: 'POST' as const,
                schedule: '*/5 * * * *',
                timeZone: 'UTC',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const updatedJob = {
                ...existingJob,
                ...updateDto,
                updatedAt: new Date(),
            };

            mockCronJobModel.findById.mockReturnValue(existingJob);
            mockCronJobModel.update.mockReturnValue(updatedJob);

            const result = await service.updateCronJob(updateDto);

            expect(result).toBeDefined();
            expect(result?.uri).toBe(updateDto.uri);
            expect(result?.schedule).toBe(updateDto.schedule);
            expect(mockCronJobModel.update).toHaveBeenCalled();
        });

        it('should throw error if job not found', async () => {
            const updateDto: UpdateCronJobDto = {
                id: 'non-existent',
                uri: 'http://localhost:3001/webhook',
            };

            mockCronJobModel.findById.mockReturnValue(undefined);

            await expect(service.updateCronJob(updateDto)).rejects.toThrow(
                'CRON job with id non-existent not found',
            );
        });
    });

    describe('deleteCronJob', () => {
        it('should delete a cron job successfully', async () => {
            const jobId = '123';
            const mockJob = {
                id: jobId,
                uri: 'http://localhost:3001/webhook',
                httpMethod: 'POST' as const,
                schedule: '*/5 * * * *',
                timeZone: 'UTC',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockCronJobModel.findById.mockReturnValue(mockJob);
            mockCronJobModel.delete.mockReturnValue(true);

            const result = await service.deleteCronJob(jobId);

            expect(result).toBe(true);
            expect(mockCronJobModel.delete).toHaveBeenCalledWith(jobId);
        });

        it('should return false if job not found', async () => {
            const jobId = 'non-existent';

            mockCronJobModel.findById.mockReturnValue(undefined);

            const result = await service.deleteCronJob(jobId);

            expect(result).toBe(false);
            expect(mockCronJobModel.delete).not.toHaveBeenCalled();
        });
    });

    describe('getAllCronJobs', () => {
        it('should return all cron jobs', () => {
            const mockJobs = [
                {
                    id: '1',
                    uri: 'http://localhost:3001/webhook1',
                    httpMethod: 'POST' as const,
                    schedule: '*/5 * * * *',
                    timeZone: 'UTC',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: '2',
                    uri: 'http://localhost:3001/webhook2',
                    httpMethod: 'GET' as const,
                    schedule: '0 */1 * * *',
                    timeZone: 'UTC',
                    isActive: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockCronJobModel.findAll.mockReturnValue(mockJobs);

            const result = service.getAllCronJobs();

            expect(result).toEqual(mockJobs);
            expect(result).toHaveLength(2);
        });
    });

    describe('getCronJobById', () => {
        it('should return a cron job by id', () => {
            const jobId = '123';
            const mockJob = {
                id: jobId,
                uri: 'http://localhost:3001/webhook',
                httpMethod: 'POST' as const,
                schedule: '*/5 * * * *',
                timeZone: 'UTC',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockCronJobModel.findById.mockReturnValue(mockJob);

            const result = service.getCronJobById(jobId);

            expect(result).toEqual(mockJob);
            expect(mockCronJobModel.findById).toHaveBeenCalledWith(jobId);
        });

        it('should return null if job not found', () => {
            const jobId = 'non-existent';

            mockCronJobModel.findById.mockReturnValue(undefined);

            const result = service.getCronJobById(jobId);

            expect(result).toBeNull();
        });
    });

    describe('getServiceStatus', () => {
        it('should return service status', () => {
            const mockJobs = [
                { id: '1', uri: 'test1' },
                { id: '2', uri: 'test2' },
            ];

            mockCronJobModel.findAll.mockReturnValue(mockJobs);

            const result = service.getServiceStatus();

            expect(result).toEqual({
                isInitialized: true,
                clusterMode: false,
                activeTasks: 0,
                totalJobs: 2,
            });
        });
    });
});