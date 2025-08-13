import CronJobModel from '../../models/CronJob';

describe('cronjobmodel', () => {
    beforeEach(() => {
        // clear stored cron jobs before each test
        CronJobModel.clear();
    });

    // mock cron job data for testing
    const mockJob = {
        id: 'test-1',
        uri: 'http://localhost:3000/webhook',
        httpMethod: 'POST' as const,
        schedule: '0 9 * * *',
        timeZone: 'UTC',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    it('should create and find a job', () => {
        // create job in model
        const created = CronJobModel.create(mockJob);

        // find job by id
        const found = CronJobModel.findById('test-1');

        expect(created).toEqual(mockJob);
        expect(found).toEqual(mockJob);
    });

    it('should update a job', () => {
        // create initial job
        CronJobModel.create(mockJob);

        // update job active status
        const updated = CronJobModel.update('test-1', { isActive: false });

        expect(updated?.isActive).toBe(false);
    });

    it('should delete a job', () => {
        // create initial job
        CronJobModel.create(mockJob);

        // delete job from model
        const deleted = CronJobModel.delete('test-1');

        // try finding deleted job
        const found = CronJobModel.findById('test-1');

        expect(deleted).toBe(true);
        expect(found).toBeUndefined();
    });
});
