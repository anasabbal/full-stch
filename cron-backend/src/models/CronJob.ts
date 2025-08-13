import { CronJob as CronJobType } from '../types';

class CronJobModel {
    // in-memory storage for cron jobs
    private jobs: Map<string, CronJobType> = new Map();

    // create and store a new cron job
    create(job: CronJobType): CronJobType {
        this.jobs.set(job.id, job);
        return job;
    }

    // find a cron job by its id
    findById(id: string): CronJobType | undefined {
        return this.jobs.get(id);
    }

    // return all cron jobs as an array
    findAll(): CronJobType[] {
        return Array.from(this.jobs.values());
    }

    // update an existing cron job
    update(id: string, updates: Partial<CronJobType>): CronJobType | null {
        const job = this.jobs.get(id);
        if (!job) return null;

        const updatedJob = { ...job, ...updates, updatedAt: new Date() };
        this.jobs.set(id, updatedJob);
        return updatedJob;
    }

    // delete a cron job by its id
    delete(id: string): boolean {
        return this.jobs.delete(id);
    }

    // remove all stored cron jobs
    clear(): void {
        this.jobs.clear();
    }
}

// export a singleton instance for global use
export default new CronJobModel();
