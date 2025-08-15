import { Injectable, Logger } from '@nestjs/common';
import { CronJob } from '../types/cron-job.interface';

@Injectable()
export class CronJobModel {
    private readonly logger = new Logger(CronJobModel.name);
    private jobs: Map<string, CronJob> = new Map();

    create(job: CronJob): CronJob {
        this.jobs.set(job.id, job);
        this.logger.log(`Created cron job: ${job.id}`);
        return job;
    }

    findById(id: string): CronJob | undefined {
        return this.jobs.get(id);
    }

    findAll(): CronJob[] {
        return Array.from(this.jobs.values());
    }

    update(id: string, updates: Partial<CronJob>): CronJob | null {
        const job = this.jobs.get(id);
        if (!job) return null;

        const updatedJob = { ...job, ...updates, updatedAt: new Date() };
        this.jobs.set(id, updatedJob);
        this.logger.log(`Updated cron job: ${id}`);
        return updatedJob;
    }

    delete(id: string): boolean {
        const deleted = this.jobs.delete(id);
        if (deleted) {
            this.logger.log(`Deleted cron job: ${id}`);
        }
        return deleted;
    }

    clear(): void {
        this.jobs.clear();
        this.logger.log('Cleared all cron jobs');
    }
}