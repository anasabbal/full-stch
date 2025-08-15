import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import axios, { AxiosResponse } from 'axios';

// Mock axios at the module level
jest.mock('axios', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const mockedAxios = axios as jest.MockedFunction<typeof axios>;

describe('NotificationService', () => {
    let service: NotificationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [NotificationService],
        }).compile();

        service = module.get<NotificationService>(NotificationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('notify', () => {
        it('should send POST notification successfully', async () => {
            const mockResponse: AxiosResponse = {
                status: 200,
                statusText: 'OK',
                data: { success: true },
                headers: {},
                config: {} as any,
            };

            mockedAxios.mockResolvedValue(mockResponse);

            await service.notify(
                'http://localhost:3001/webhook',
                'POST',
                'Test message',
            );

            expect(mockedAxios).toHaveBeenCalledWith({
                method: 'post',
                url: 'http://localhost:3001/webhook',
                timeout: 10000,
                headers: {
                    'content-type': 'application/json',
                    'user-agent': 'cron-service-nestjs/1.0.0',
                },
                data: {
                    message: expect.stringContaining('Test message'),
                    timestamp: expect.any(String),
                    cronJob: true,
                },
            });
        });

        it('should send GET notification successfully', async () => {
            const mockResponse: AxiosResponse = {
                status: 200,
                statusText: 'OK',
                data: { success: true },
                headers: {},
                config: {} as any,
            };

            mockedAxios.mockResolvedValue(mockResponse);

            await service.notify('http://localhost:3001/webhook', 'GET');

            expect(mockedAxios).toHaveBeenCalledWith({
                method: 'get',
                url: 'http://localhost:3001/webhook',
                timeout: 10000,
                headers: {
                    'content-type': 'application/json',
                    'user-agent': 'cron-service-nestjs/1.0.0',
                },
            });
        });

        it('should handle connection refused error', async () => {
            const error = {
                code: 'ECONNREFUSED',
                message: 'Connection refused',
            };

            mockedAxios.mockRejectedValue(error);

            await expect(
                service.notify('http://localhost:3001/webhook', 'POST', 'Test'),
            ).resolves.toBeUndefined();
        });

        it('should handle timeout error', async () => {
            const error = {
                code: 'ETIMEDOUT',
                message: 'Timeout',
            };

            mockedAxios.mockRejectedValue(error);

            await expect(
                service.notify('http://localhost:3001/webhook', 'POST', 'Test'),
            ).resolves.toBeUndefined();
        });

        it('should handle HTTP error response', async () => {
            const error = {
                response: {
                    status: 500,
                    statusText: 'Internal Server Error',
                    data: { error: 'Server error' },
                },
            };

            mockedAxios.mockRejectedValue(error);

            await expect(
                service.notify('http://localhost:3001/webhook', 'POST', 'Test'),
            ).resolves.toBeUndefined();
        });
    });
});