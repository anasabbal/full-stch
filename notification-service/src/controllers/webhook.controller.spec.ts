import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { WebhookController } from './webhook.controller';
import { LogService } from '../services/log.service';
import { WebhookDto } from '../dto/webhook.dto';

describe('WebhookController', () => {
    let controller: WebhookController;
    let logService: LogService;

    const mockLogService = {
        addLog: jest.fn(),
        getAllLogs: jest.fn(),
        getRecentLogs: jest.fn(),
        getLogCount: jest.fn(),
        clearLogs: jest.fn(),
    };

    const createMockRequest = (method: string, url: string = '/webhook'): Request => ({
        method,
        originalUrl: url,
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
        get: jest.fn((header: string) => {
            if (header === 'User-Agent') return 'test-agent';
            return undefined;
        }),
        headers: { 'content-type': 'application/json' },
        query: {},
    } as unknown as Request);

    const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    } as unknown as Response;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [WebhookController],
            providers: [
                {
                    provide: LogService,
                    useValue: mockLogService,
                },
            ],
        }).compile();

        controller = module.get<WebhookController>(WebhookController);
        logService = module.get<LogService>(LogService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('handleWebhook', () => {
        it('should handle webhook request successfully', () => {
            const mockRequest = createMockRequest('POST', '/webhook');
            const body: WebhookDto = {
                message: 'Test webhook',
                timestamp: '2024-01-01T00:00:00Z',
                cronJob: true,
            };

            const mockLogEntry = {
                id: '123',
                timestamp: '2024-01-01T00:00:00Z',
                method: 'POST',
                url: '/webhook',
                headers: mockRequest.headers,
                body,
                userAgent: 'test-agent',
                ip: '127.0.0.1',
                message: 'Test webhook',
            };

            mockLogService.addLog.mockReturnValue(mockLogEntry);

            controller.handleWebhook(body, mockRequest, mockResponse);

            expect(mockLogService.addLog).toHaveBeenCalledWith({
                method: 'POST',
                url: '/webhook',
                headers: mockRequest.headers,
                body,
                userAgent: 'test-agent',
                ip: '127.0.0.1',
                message: 'Test webhook',
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Webhook received successfully',
                timestamp: expect.any(String),
                logId: '123',
                receivedData: body,
            });
        });

        it('should handle webhook without message', () => {
            const mockRequest = createMockRequest('POST', '/webhook');
            const body: WebhookDto = {};

            const mockLogEntry = {
                id: '124',
                timestamp: '2024-01-01T00:00:00Z',
                method: 'POST',
                url: '/webhook',
                headers: mockRequest.headers,
                body,
                userAgent: 'test-agent',
                ip: '127.0.0.1',
                message: 'Webhook received',
            };

            mockLogService.addLog.mockReturnValue(mockLogEntry);

            controller.handleWebhook(body, mockRequest, mockResponse);

            expect(mockLogService.addLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Webhook received',
                }),
            );
        });
    });

    describe('getLogs', () => {
        it('should return logs with default limit', () => {
            const mockLogs = [
                {
                    id: '1',
                    timestamp: '2024-01-01T00:00:00Z',
                    method: 'POST',
                    url: '/webhook',
                    headers: {},
                    body: {},
                    userAgent: 'test',
                    ip: '127.0.0.1',
                },
            ];

            mockLogService.getRecentLogs.mockReturnValue(mockLogs);
            mockLogService.getLogCount.mockReturnValue(1);

            const result = controller.getLogs();

            expect(result).toEqual({
                logs: mockLogs,
                total: 1,
                timestamp: expect.any(String),
            });

            expect(mockLogService.getRecentLogs).toHaveBeenCalledWith(50);
        });

        it('should return logs with custom limit', () => {
            const mockLogs: any[] = [];
            mockLogService.getRecentLogs.mockReturnValue(mockLogs);
            mockLogService.getLogCount.mockReturnValue(0);

            const result = controller.getLogs('10');

            expect(mockLogService.getRecentLogs).toHaveBeenCalledWith(10);
        });
    });

    describe('getAllLogs', () => {
        it('should return all logs', () => {
            const mockLogs = [
                {
                    id: '1',
                    timestamp: '2024-01-01T00:00:00Z',
                    method: 'POST',
                    url: '/webhook',
                    headers: {},
                    body: {},
                    userAgent: 'test',
                    ip: '127.0.0.1',
                },
            ];

            mockLogService.getAllLogs.mockReturnValue(mockLogs);
            mockLogService.getLogCount.mockReturnValue(1);

            const result = controller.getAllLogs();

            expect(result).toEqual({
                logs: mockLogs,
                total: 1,
                timestamp: expect.any(String),
            });
        });
    });

    describe('clearLogs', () => {
        it('should clear all logs', () => {
            const result = controller.clearLogs();

            expect(mockLogService.clearLogs).toHaveBeenCalled();
            expect(result).toEqual({
                success: true,
                message: 'All logs cleared',
                timestamp: expect.any(String),
            });
        });
    });

    describe('getHealth', () => {
        it('should return health status', () => {
            mockLogService.getLogCount.mockReturnValue(5);

            const result = controller.getHealth();

            expect(result).toEqual({
                status: 'ok',
                service: 'notification-service-nestjs',
                version: '1.0.0',
                timestamp: expect.any(String),
                logCount: 5,
                uptime: expect.any(Number),
                memory: expect.any(Object),
            });
        });
    });

    describe('getStatus', () => {
        it('should return detailed status', () => {
            const mockRecentLogs = [
                {
                    id: '1',
                    timestamp: '2024-01-01T00:00:00Z',
                    method: 'POST',
                    url: '/webhook',
                    headers: {},
                    body: {},
                    userAgent: 'test',
                    ip: '127.0.0.1',
                },
            ];

            mockLogService.getLogCount.mockReturnValue(10);
            mockLogService.getRecentLogs.mockReturnValue(mockRecentLogs);

            const result = controller.getStatus();

            expect(result).toEqual({
                service: 'notification-service-nestjs',
                status: 'running',
                version: '1.0.0',
                timestamp: expect.any(String),
                logs: {
                    total: 10,
                    recent: mockRecentLogs,
                },
                system: {
                    uptime: expect.any(Number),
                    memory: expect.any(Object),
                    nodeVersion: expect.any(String),
                    platform: expect.any(String),
                },
            });
        });
    });

    describe('handleGetTest', () => {
        it('should handle GET test endpoint', () => {
            const mockRequest = createMockRequest('GET', '/test');

            const mockLogEntry = {
                id: '125',
                timestamp: '2024-01-01T00:00:00Z',
                method: 'GET',
                url: '/test',
                headers: mockRequest.headers,
                body: mockRequest.query,
                userAgent: 'test-agent',
                ip: '127.0.0.1',
                message: 'GET test endpoint called',
            };

            mockLogService.addLog.mockReturnValue(mockLogEntry);

            const result = controller.handleGetTest(mockRequest);

            expect(result).toEqual({
                message: 'GET test successful',
                timestamp: expect.any(String),
                query: mockRequest.query,
            });

            expect(mockLogService.addLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'GET',
                    url: '/test',
                    message: 'GET test endpoint called',
                }),
            );
        });
    });

    describe('handlePostTest', () => {
        it('should handle POST test endpoint', () => {
            const mockRequest = createMockRequest('POST', '/test');
            const body = { test: 'data' };

            const mockLogEntry = {
                id: '126',
                timestamp: '2024-01-01T00:00:00Z',
                method: 'POST',
                url: '/test',
                headers: mockRequest.headers,
                body,
                userAgent: 'test-agent',
                ip: '127.0.0.1',
                message: 'POST test endpoint called',
            };

            mockLogService.addLog.mockReturnValue(mockLogEntry);

            const result = controller.handlePostTest(body, mockRequest);

            expect(result).toEqual({
                message: 'POST test successful',
                timestamp: expect.any(String),
                receivedBody: body,
            });

            expect(mockLogService.addLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'POST',
                    url: '/test',
                    body,
                    message: 'POST test endpoint called',
                }),
            );
        });
    });
});