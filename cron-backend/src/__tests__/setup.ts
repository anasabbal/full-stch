import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Mock external dependencies
jest.mock('ioredis', () => jest.fn(() => ({ disconnect: jest.fn() })));
jest.mock('bullmq', () => ({ Queue: jest.fn(), Worker: jest.fn() }));
jest.mock('node-cron', () => ({
    validate: jest.fn(() => true),
    schedule: jest.fn(() => ({ stop: jest.fn() })),
}));