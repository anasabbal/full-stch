import { Test, TestingModule } from '@nestjs/testing';
import { CronJobResolver } from './cron-job.resolver';
import { CronJobManagerService } from '../services/cron-job-manager.service';
import { CreateCronJobDto } from '../dto/create-cron-job.dto';
import { UpdateCronJobDto } from '../dto/update-cron-job.dto';

describe('CronJobResolver', () => {
    let resolver: CronJobResolver;
    let cronJobManagerService: CronJobManagerService;

    const mockCronJobManagerService = {
        getAllCronJobs: jest.fn(),
        getCronJobById: jest.fn(),
        createCronJob: jest.fn(),
        updateCronJob: jest.fn(),
        deleteCronJob: jest.fn(),
        getServiceStatus: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CronJobResolver,
                {
                    provide: CronJobManagerService,
                    useValue: mockCronJobManagerService,
                },
            ],
        }).compile();

        resolver = module.get<CronJobResolver>(CronJobResolver);
        cronJobManagerService = module.get<CronJobManagerService>(CronJobManagerService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(resolver).toBeDefined();
    });

    describe('cronJobs', () => {
        it('should return all cron jobs', async () => {
            const mockJobs = [
                {
                    id: '1',
                    uri: 'http://localhost:3001/webhook',
                    httpMethod: 'POST',
                    schedule: '*/5 * * * *',
                    timeZone: 'UTC',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockCronJobManagerService.getAllCronJobs.mockReturnValue(mockJobs);

            const result = await resolver.cronJobs();

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('1');
            expect(result[0].createdAt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('should handle errors', async () => {
            mockCronJobManagerService.getAllCronJobs.mockImplementation(() => {
                throw new Error('Database error');
            });

            await expect(resolver.cronJobs()).rejects.toThrow(
                'Failed to fetch cron jobs',
            );
        });
    });

    describe('cronJob', () => {
        it('should return a cron job by id', async () => {
            const mockJob = {
                id: '123',
                uri: 'http://localhost:3001/webhook',
                httpMethod: 'POST',
                schedule: '*/5 * * * *',
                timeZone: 'UTC',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockCronJobManagerService.getCronJobById.mockReturnValue(mockJob);

            const result = await resolver.cronJob('123');

            expect(result).toBeDefined();
            expect(result?.id).toBe('123');
        });

        it('should throw error if job not found', async () => {
            mockCronJobManagerService.getCronJobById.mockReturnValue(null);

            await expect(resolver.cronJob('non-existent')).rejects.toThrow(
                'Cron job with id non-existent not found',
            );
        });
    });

    describe('createCronJob', () => {
        it('should create a cron job', async () => {
            const createDto: CreateCronJobDto = {
                uri: 'http://localhost:3001/webhook',
                httpMethod: 'POST',
                body: 'Test message',
                schedule: '*/5 * * * *',
                timeZone: 'UTC',
            };

            const mockCreatedJob = {
                id: '123',
                ...createDto,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockCronJobManagerService.createCronJob.mockResolvedValue(mockCreatedJob);

            const result = await resolver.createCronJob(createDto);

            expect(result).toBeDefined();
            expect(result.id).toBe('123');
            expect(result.uri).toBe(createDto.uri);
        });

        it('should handle creation errors', async () => {
            const createDto: CreateCronJobDto = {
                uri: 'http://localhost:3001/webhook',
                httpMethod: 'POST',
                schedule: '*/5 * * * *',
                timeZone: 'UTC',
            };

            mockCronJobManagerService.createCronJob.mockRejectedValue(
                new Error('Invalid schedule'),
            );

            await expect(resolver.createCronJob(createDto)).rejects.toThrow(
                'Failed to create cron job: Invalid schedule',
            );
        });
    });

    describe('health', () => {
        it('should return health status', async () => {
            mockCronJobManagerService.getServiceStatus.mockReturnValue({
                isInitialized: true,
                clusterMode: false,
                activeTasks: 0,
                totalJobs: 0,
            });

            const result = await resolver.health();

            expect(result).toContain('running');
            expect(result).toContain(new Date().getFullYear().toString());
        });
    });

    describe('serviceStatus', () => {
        it('should return service status', async () => {
            const mockStatus = {
                isInitialized: true,
                clusterMode: false,
                activeTasks: 2,
                totalJobs: 5,
            };

            mockCronJobManagerService.getServiceStatus.mockReturnValue(mockStatus);

            const result = await resolver.serviceStatus();

            expect(result).toEqual(mockStatus);
        });
    });
});