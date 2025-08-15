import { Test, TestingModule } from '@nestjs/testing';
import { CronJobModel } from './cron-job.model';
import { CronJob } from '../types/cron-job.interface';

describe('CronJobModel', () => {
    let model: CronJobModel;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CronJobModel],
        }).compile();

        model = module.get<CronJobModel>(CronJobModel);
    });

    afterEach(() => {
        model.clear();
    });

    it('should be defined', () => {
        expect(model).toBeDefined();
    });

    describe('create', () => {
        it('should create and store a cron job', () => {
            const cronJob: CronJob = {
                id: '123',
                uri: 'http://localhost:3001/webhook',
                httpMethod: 'POST',
                body: 'Test message',
                schedule: '*/5 * * * *',
                timeZone: 'UTC',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = model.create(cronJob);

            expect(result).toEqual(cronJob);
            expect(model.findById('123')).toEqual(cronJob);
        });
    });

    describe('findById', () => {
        it('should find a cron job by id', () => {
            const cronJob: CronJob = {
                id: '123',
                uri: 'http://localhost:3001/webhook',
                httpMethod: 'POST',
                schedule: '*/5 * * * *',
                timeZone: 'UTC',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            model.create(cronJob);

            const result = model.findById('123');
            expect(result).toEqual(cronJob);
        });

        it('should return undefined for non-existent id', () => {
            const result = model.findById('non-existent');
            expect(result).toBeUndefined();
        });
    });

    describe('findAll', () => {
        it('should return all cron jobs', () => {
            const cronJob1: CronJob = {
                id: '1',
                uri: 'http://localhost:3001/webhook1',
                httpMethod: 'POST',
                schedule: '*/5 * * * *',
                timeZone: 'UTC',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const cronJob2: CronJob = {
                id: '2',
                uri: 'http://localhost:3001/webhook2',
                httpMethod: 'GET',
                schedule: '0 */1 * * *',
                timeZone: 'UTC',
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            model.create(cronJob1);
            model.create(cronJob2);

            const result = model.findAll();
            expect(result).toHaveLength(2);
            expect(result).toContain(cronJob1);
            expect(result).toContain(cronJob2);
        });

        it('should return empty array when no jobs exist', () => {
            const result = model.findAll();
            expect(result).toEqual([]);
        });
    });

    describe('update', () => {
        it('should update an existing cron job', async () => {
            const cronJob: CronJob = {
                id: '123',
                uri: 'http://localhost:3001/webhook',
                httpMethod: 'POST',
                schedule: '*/5 * * * *',
                timeZone: 'UTC',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            model.create(cronJob);

            await new Promise(resolve => setTimeout(resolve, 10));

            const updates = {
                uri: 'http://localhost:3001/webhook-updated',
                isActive: false,
            };

            const result = model.update('123', updates);

            expect(result).toBeDefined();
            expect(result?.uri).toBe(updates.uri);
            expect(result?.isActive).toBe(updates.isActive);
            expect(result?.updatedAt.getTime()).toBeGreaterThan(cronJob.updatedAt.getTime());
        });

        it('should return null for non-existent job', () => {
            const result = model.update('non-existent', { uri: 'test' });
            expect(result).toBeNull();
        });
    });

    describe('delete', () => {
        it('should delete an existing cron job', () => {
            const cronJob: CronJob = {
                id: '123',
                uri: 'http://localhost:3001/webhook',
                httpMethod: 'POST',
                schedule: '*/5 * * * *',
                timeZone: 'UTC',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            model.create(cronJob);

            const result = model.delete('123');

            expect(result).toBe(true);
            expect(model.findById('123')).toBeUndefined();
        });

        it('should return false for non-existent job', () => {
            const result = model.delete('non-existent');
            expect(result).toBe(false);
        });
    });

    describe('clear', () => {
        it('should clear all cron jobs', () => {
            const cronJob: CronJob = {
                id: '123',
                uri: 'http://localhost:3001/webhook',
                httpMethod: 'POST',
                schedule: '*/5 * * * *',
                timeZone: 'UTC',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            model.create(cronJob);
            expect(model.findAll()).toHaveLength(1);

            model.clear();
            expect(model.findAll()).toHaveLength(0);
        });
    });
});