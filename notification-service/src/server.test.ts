import request from 'supertest';
import fs from 'fs';

// mock fs before importing the app
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

// store original console methods to restore later
const originalLog = console.log;
const originalError = console.error;

describe('notification service server', () => {
    let app: any;

    beforeAll(async () => {
        // set test environment
        process.env.NODE_ENV = 'test';

        // mock console to avoid test noise
        console.log = jest.fn();
        console.error = jest.fn();

        // mock fs behavior
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.mkdirSync.mockImplementation(() => undefined);
        mockedFs.appendFileSync.mockImplementation(() => undefined);
        mockedFs.readFileSync.mockReturnValue('');

        // import app after mocks are set
        app = (await import('./server')).default;
    });

    afterAll(() => {
        // restore console behavior
        console.log = originalLog;
        console.error = originalError;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return service info on get /', async () => {
        const response = await request(app).get('/');

        expect(response.status).toBe(200);
        expect(response.body.service).toBe('CRON Notification Service');
        expect(response.body.version).toBe('1.0.0');
        expect(response.body.status).toBe('running');
    });

    it('should handle post to /webhook', async () => {
        const testData = { message: '2024-01-01 09:00:00 - test notification' };

        const response = await request(app)
            .post('/webhook')
            .send(testData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.method).toBe('POST');
        expect(response.body.receivedData).toEqual(testData);
    });

    it('should handle get to /webhook', async () => {
        const response = await request(app).get('/webhook');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.method).toBe('GET');
    });

    it('should handle put to /webhook', async () => {
        const testData = { message: '2024-01-01 10:00:00 - put notification' };

        const response = await request(app)
            .put('/webhook')
            .send(testData);

        expect(response.status).toBe(200);
        expect(response.body.method).toBe('PUT');
    });

    it('should handle delete to /webhook', async () => {
        const response = await request(app).delete('/webhook');

        expect(response.status).toBe(200);
        expect(response.body.method).toBe('DELETE');
    });

    it('should log messages correctly', async () => {
        const cronMessage = '2024-01-01 09:00:00 - daily backup';

        await request(app)
            .post('/webhook')
            .send({ message: cronMessage });

        expect(mockedFs.appendFileSync).toHaveBeenCalled();

        const logCall = mockedFs.appendFileSync.mock.calls[0];
        const logData = JSON.parse(logCall[1] as string);

        expect(logData.logMessage).toBe(cronMessage);
        expect(logData.method).toBe('POST');
    });

    it('should return health status', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
        expect(response.body.service).toBe('Notification Service');
    });

    it('should handle test endpoints', async () => {
        const getResponse = await request(app).get('/test');
        expect(getResponse.status).toBe(200);
        expect(getResponse.body.message).toBe('GET test successful');

        const postResponse = await request(app).post('/test').send({ test: 'data' });
        expect(postResponse.status).toBe(200);
        expect(postResponse.body.message).toBe('POST test successful');
    });

    it('should return logs', async () => {
        mockedFs.existsSync.mockReturnValue(false);

        const response = await request(app).get('/logs');

        expect(response.status).toBe(200);
        expect(response.body.logs).toEqual([]);
    });

    it('should return 404 for unknown endpoints', async () => {
        const response = await request(app).get('/unknown');

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Endpoint not found');
    });

    it('should handle logging errors gracefully', async () => {
        mockedFs.appendFileSync.mockImplementation(() => {
            throw new Error('file error');
        });

        const response = await request(app)
            .post('/webhook')
            .send({ message: 'test' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
});
