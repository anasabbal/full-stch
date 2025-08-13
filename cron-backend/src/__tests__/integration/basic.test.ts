import { CronJobManager } from '../../services/cron.manager';
import CronJobModel from '../../models/CronJob';

describe('basic integration', () => {
    let manager: CronJobManager;

    beforeEach(() => {
        // clear in-memory cron job model before each test
        CronJobModel.clear();

        // create a new cron job manager instance for testing
        manager = new CronJobManager();

        // mock console.log to avoid clutter in test output
        jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        // restore all mocked functions after each test
        jest.restoreAllMocks();
    });

    it('should complete full job lifecycle', async () => {
        // create a new cron job
        const job = await manager.createCronJob({
            uri: 'http://localhost:3000/test',
            httpMethod: 'POST',
            schedule: '0 9 * * *',
            timeZone: 'UTC',
            body: 'test job',
        });

        // ensure job id is generated
        expect(job.id).toBeDefined();

        // retrieve job by id
        const found = manager.getCronJobById(job.id);
        expect(found).toEqual(job);

        // update job body
        const updated = await manager.updateCronJob({
            id: job.id,
            body: 'updated body',
        });
        expect(updated?.body).toBe('updated body');

        // delete job
        const deleted = await manager.deleteCronJob(job.id);
        expect(deleted).toBe(true);

        // ensure job is no longer found
        const notFound = manager.getCronJobById(job.id);
        expect(notFound).toBeNull();
    });
});
