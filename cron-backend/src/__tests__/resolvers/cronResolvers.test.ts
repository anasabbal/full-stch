import { resolvers } from '../../resolvers/cronResolvers';
import { cronJobManager } from '../../services/cron.manager';

// mock the cron job manager module
jest.mock('../../services/cron.manager');
const mockedManager = cronJobManager as jest.Mocked<typeof cronJobManager>;

describe('cron resolvers', () => {
    beforeEach(() => {
        // reset all mock call data before each test
        jest.clearAllMocks();
    });

    it('should query all cron jobs', () => {
        // mock returned job list
        const mockJobs = [{ id: '1' }, { id: '2' }];
        mockedManager.getAllCronJobs.mockReturnValue(mockJobs as any);

        // call resolver query
        const result = resolvers.Query.cronJobs();

        expect(result).toEqual(mockJobs);
    });

    it('should create a cron job', async () => {
        // sample input for creating a cron job
        const input = {
            uri: 'http://localhost:3000/webhook',
            httpMethod: 'POST' as const,
            schedule: '0 9 * * *',
            timeZone: 'UTC',
        };

        // expected cron job object returned by manager
        const expectedJob = { id: 'new-job', ...input };
        mockedManager.createCronJob.mockResolvedValue(expectedJob as any);

        // call resolver mutation
        const result = await resolvers.Mutation.createCronJob(null, { input });

        expect(result).toEqual(expectedJob);
        expect(mockedManager.createCronJob).toHaveBeenCalledWith(input);
    });

    it('should delete a cron job', async () => {
        // mock successful deletion
        mockedManager.deleteCronJob.mockResolvedValue(true);

        // call resolver mutation
        const result = await resolvers.Mutation.deleteCronJob(null, { id: 'test' });

        expect(result).toBe(true);
        expect(mockedManager.deleteCronJob).toHaveBeenCalledWith('test');
    });
});
