import { CronJobManager } from '../../services/cron.manager';
import CronJobModel from '../../models/CronJob';

// mock the cron job model
jest.mock('../../models/CronJob');
const mockedModel = CronJobModel as jest.Mocked<typeof CronJobModel>;

describe('cronjobmanager', () => {
    let manager: CronJobManager;

    beforeEach(() => {
        // create a new manager instance before each test
        manager = new CronJobManager();

        // mock console.log to avoid extra output
        jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        // restore all mocked implementations after each test
        jest.restoreAllMocks();
    });

    it('should create a cron job', async () => {
        // sample cron job input
        const input = {
            uri: 'http://localhost:3000/webhook',
            httpMethod: 'POST' as const,
            schedule: '0 9 * * *',
            timeZone: 'UTC',
            body: 'test message',
        };

        // mock model create method to return the passed job
        mockedModel.create.mockImplementation(job => job);

        // create job through manager
        const result = await manager.createCronJob(input);

        expect(result).toMatchObject(input);
        expect(result.id).toBeDefined();
        expect(result.isActive).toBe(true);
        expect(mockedModel.create).toHaveBeenCalled();
    });

    it('should get all jobs', () => {
        // mock returned job list
        const mockJobs = [{ id: '1' }, { id: '2' }];
        mockedModel.findAll.mockReturnValue(mockJobs as any);

        // get all jobs through manager
        const result = manager.getAllCronJobs();

        expect(result).toEqual(mockJobs);
        expect(mockedModel.findAll).toHaveBeenCalled();
    });

    it('should delete a job', async () => {
        // mock existing job and successful deletion
        mockedModel.findById.mockReturnValue({ id: 'test' } as any);
        mockedModel.delete.mockReturnValue(true);

        // delete job through manager
        const result = await manager.deleteCronJob('test');

        expect(result).toBe(true);
        expect(mockedModel.delete).toHaveBeenCalledWith('test');
    });
});
