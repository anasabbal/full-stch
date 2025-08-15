import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { CronJobManagerService } from '../services/cron-job-manager.service';

describe('HealthController', () => {
    let controller: HealthController;
    let cronJobManagerService: CronJobManagerService;

    const mockCronJobManagerService = {
        getServiceStatus: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                {
                    provide: CronJobManagerService,
                    useValue: mockCronJobManagerService,
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
        cronJobManagerService = module.get<CronJobManagerService>(CronJobManagerService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getHealth', () => {
        it('should return health status when service is initialized', () => {
            mockCronJobManagerService.getServiceStatus.mockReturnValue({
                isInitialized: true,
                clusterMode: false,
                activeTasks: 0,
                totalJobs: 0,
            });

            const result = controller.getHealth();

            expect(result).toEqual({
                status: 'ok',
                timestamp: expect.any(String),
                service: 'cron backend nestjs',
                version: '1.0.0',
                isInitialized: true,
                clusterMode: false,
                activeTasks: 0,
                totalJobs: 0,
            });
        });

        it('should return initializing status when service is not initialized', () => {
            mockCronJobManagerService.getServiceStatus.mockReturnValue({
                isInitialized: false,
                clusterMode: false,
                activeTasks: 0,
                totalJobs: 0,
            });

            const result = controller.getHealth();

            expect(result.status).toBe('initializing');
        });

        it('should handle errors', () => {
            mockCronJobManagerService.getServiceStatus.mockImplementation(() => {
                throw new Error('Service error');
            });

            const result = controller.getHealth();

            expect(result).toEqual({
                status: 'error',
                message: 'Service error',
                timestamp: expect.any(String),
            });
        });
    });

    describe('getStatus', () => {
        it('should return detailed status', () => {
            const mockStatus = {
                isInitialized: true,
                clusterMode: false,
                activeTasks: 2,
                totalJobs: 5,
            };

            mockCronJobManagerService.getServiceStatus.mockReturnValue(mockStatus);

            const result = controller.getStatus();

            expect(result).toEqual({
                ...mockStatus,
                timestamp: expect.any(String),
                uptime: expect.any(Number),
                memory: expect.any(Object),
                nodeVersion: expect.any(String),
                platform: expect.any(String),
            });
        });
    });
});