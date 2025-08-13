import * as cron from 'node-cron';
import { Queue, Worker, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone';
import { CronJob, CreateCronInput, UpdateCronInput } from '../types';
import CronJobModel from '../models/CronJob';
import NotificationService from './NotificationService';
import { getRedisClient } from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

/**
 * CronJobManager - Manages CRON job scheduling and execution
 * Supports both single-instance (node-cron) and cluster mode (BullMQ + Redis)
 */
class CronJobManager {
    private tasks: Map<string, cron.ScheduledTask> = new Map();
    private cronQueue: Queue | null = null;
    private worker: Worker | null = null;
    private isInitialized: boolean = false;

    constructor() {
        this.initializeClusterSupport();
    }

    /**
     * initialize BullMQ cluster support if enabled
     */
    private async initializeClusterSupport(): Promise<void> {
        if (process.env.USE_CLUSTER === 'true') {
            try {
                const redis = await getRedisClient();
                if (redis) {
                    this.cronQueue = new Queue('cron-jobs', { connection: redis });

                    this.worker = new Worker('cron-jobs', async (job: Job) => {
                        const { cronJobId } = job.data;
                        await this.executeCronJob(cronJobId);
                    }, { connection: redis });

                    this.isInitialized = true;
                    console.log('✅ BullMQ cluster support initialized');
                }
            } catch (error) {
                console.error('❌ Failed to initialize cluster support:', error);
                this.isInitialized = false;
            }
        } else {
            this.isInitialized = true;
            console.log('✅ Single-instance mode initialized');
        }
    }

    /**
     * execute a CRON job by ID
     */
    private async executeCronJob(cronJobId: string): Promise<void> {
        const cronJob = CronJobModel.findById(cronJobId);

        if (cronJob && cronJob.isActive) {
            try {
                await NotificationService.notify(cronJob.uri, cronJob.httpMethod, cronJob.body);

                // update both lastRun AND nextRun after execution
                const now = new Date();
                const nextRun = this.calculateNextRunTime(cronJob.schedule, cronJob.timeZone);

                CronJobModel.update(cronJobId, {
                    lastRun: now,
                    nextRun: nextRun
                });

                console.log(`✅ CRON job ${cronJobId} executed successfully. Next run: ${nextRun}`);
            } catch (error) {
                console.error(`❌ CRON job ${cronJobId} failed:`, error);
            }
        }
    }

    /**
     * parse CRON expression and calculate next execution time
     */
    private calculateNextRunTime(schedule: string, timeZone: string): Date | undefined {
        try {
            // parse CRON expression (5 fields: minute hour day month weekday)
            const cronParts = schedule.trim().split(/\s+/);
            if (cronParts.length !== 5) {
                console.error('Invalid CRON expression:', schedule);
                return undefined;
            }

            const [minute, hour, day, month, weekday] = cronParts;

            // get current time in the specified timezone
            const now = moment.tz(timeZone);
            let nextRun = now.clone();

            // handle different CRON patterns
            if (schedule === '* * * * *') {
                // Every minute
                return nextRun.add(1, 'minute').seconds(0).milliseconds(0).toDate();
            }

            // handle */N patterns (every N minutes/hours/etc)
            if (minute.startsWith('*/')) {
                const interval = parseInt(minute.substring(2));
                const currentMinute = now.minute();
                const nextMinute = Math.ceil((currentMinute + 1) / interval) * interval;

                nextRun.minute(nextMinute).second(0).millisecond(0);

                // of we've gone past 59 minutes, move to next hour
                if (nextMinute >= 60) {
                    nextRun.add(1, 'hour').minute(nextMinute - 60);
                }

                return nextRun.toDate();
            }

            // Handle specific minute values
            if (minute !== '*') {
                const targetMinute = parseInt(minute);
                if (targetMinute > now.minute()) {
                    nextRun.minute(targetMinute).second(0).millisecond(0);
                } else {
                    nextRun.add(1, 'hour').minute(targetMinute).second(0).millisecond(0);
                }
            }

            // handle hour patterns
            if (hour !== '*') {
                if (hour.startsWith('*/')) {
                    const interval = parseInt(hour.substring(2));
                    const currentHour = now.hour();
                    const nextHour = Math.ceil((currentHour + 1) / interval) * interval;

                    if (nextHour >= 24) {
                        nextRun.add(1, 'day').hour(nextHour - 24);
                    } else {
                        nextRun.hour(nextHour);
                    }
                } else {
                    const targetHour = parseInt(hour);
                    if (targetHour > now.hour() || (targetHour === now.hour() && parseInt(minute) > now.minute())) {
                        nextRun.hour(targetHour);
                    } else {
                        nextRun.add(1, 'day').hour(targetHour);
                    }
                }
            }
            return nextRun.toDate();

        } catch (error) {
            console.error('Failed to calculate next run time:', error);
            // Fallback: add 1 minute
            return moment.tz(timeZone).add(1, 'minute').toDate();
        }
    }

    /**
     * create a new CRON job
     */
    async createCronJob(input: CreateCronInput): Promise<CronJob> {
        // validate CRON expression
        if (!cron.validate(input.schedule)) {
            throw new Error('Invalid CRON expression');
        }

        const id = uuidv4();
        const now = new Date();

        const cronJob: CronJob = {
            id,
            ...input,
            isActive: true,
            createdAt: now,
            updatedAt: now,
            nextRun: this.calculateNextRunTime(input.schedule, input.timeZone),
        };

        // save to model
        CronJobModel.create(cronJob);

        // schedule the job
        await this.scheduleJob(cronJob);

        console.log(`✅ Created CRON job ${id} with schedule: ${input.schedule}`);
        console.log(`📅 Next run calculated as: ${cronJob.nextRun}`);
        return cronJob;
    }

    /**
     * Update an existing CRON job
     */
    async updateCronJob(input: UpdateCronInput): Promise<CronJob | null> {
        const existingJob = CronJobModel.findById(input.id);
        if (!existingJob) {
            throw new Error(`CRON job with id ${input.id} not found`);
        }

        // validate CRON expression if provided
        if (input.schedule && !cron.validate(input.schedule)) {
            throw new Error('Invalid CRON expression');
        }

        // stop existing task
        await this.unscheduleJob(input.id);

        // calculate new next run time if schedule changed
        let nextRun = existingJob.nextRun;
        if (input.schedule) {
            nextRun = this.calculateNextRunTime(input.schedule, input.timeZone || existingJob.timeZone);
        }

        // update job
        const updatedJob = CronJobModel.update(input.id, {
            ...input,
            nextRun: nextRun,
        });

        if (updatedJob && updatedJob.isActive) {
            await this.scheduleJob(updatedJob);
        }

        console.log(`✅ Updated CRON job ${input.id}`);
        if (input.schedule) {
            console.log(`📅 New next run calculated as: ${nextRun}`);
        }
        return updatedJob;
    }

    /**
     * delete a CRON job
     */
    async deleteCronJob(id: string): Promise<boolean> {
        const job = CronJobModel.findById(id);
        if (!job) {
            return false;
        }

        // stop task
        await this.unscheduleJob(id);

        // remove from model
        const deleted = CronJobModel.delete(id);

        if (deleted) {
            console.log(`✅ Deleted CRON job ${id}`);
        }

        return deleted;
    }

    /**
     * get all CRON jobs
     */
    getAllCronJobs(): CronJob[] {
        return CronJobModel.findAll();
    }

    /**
     * get a specific CRON job by ID
     */
    getCronJobById(id: string): CronJob | null {
        return CronJobModel.findById(id) || null;
    }

    /**
     * schedule a CRON job using appropriate scheduler
     */
    private async scheduleJob(cronJob: CronJob): Promise<void> {
        if (this.cronQueue && process.env.USE_CLUSTER === 'true') {
            await this.scheduleWithBullMQ(cronJob);
        } else {
            await this.scheduleWithNodeCron(cronJob);
        }
    }

    /**
     * schedule job using BullMQ (cluster mode)
     */
    private async scheduleWithBullMQ(cronJob: CronJob): Promise<void> {
        try {
            if (!this.cronQueue) {
                throw new Error('BullMQ queue not initialized');
            }

            await this.cronQueue.add(
                `cron-${cronJob.id}`,
                { cronJobId: cronJob.id },
                {
                    repeat: {
                        pattern: cronJob.schedule,
                        tz: cronJob.timeZone,
                    },
                    jobId: cronJob.id,
                    removeOnComplete: 10,
                    removeOnFail: 10,
                }
            );
            console.log(`📅 Scheduled CRON job ${cronJob.id} with BullMQ`);
        } catch (error) {
            console.error(`❌ Failed to schedule job ${cronJob.id} with BullMQ:`, error);
            throw error;
        }
    }

    /**
     * schedule job using node-cron (single instance mode)
     */
    private async scheduleWithNodeCron(cronJob: CronJob): Promise<void> {
        try {
            const task = cron.schedule(
                cronJob.schedule,
                async () => {
                    await this.executeCronJob(cronJob.id);
                },
                {
                    scheduled: true,
                    timezone: cronJob.timeZone,
                }
            );

            this.tasks.set(cronJob.id, task);
            console.log(`📅 Scheduled CRON job ${cronJob.id} with node-cron`);
        } catch (error) {
            console.error(`❌ Failed to schedule job ${cronJob.id} with node-cron:`, error);
            throw error;
        }
    }

    /**
     * unschedule a CRON job
     */
    private async unscheduleJob(id: string): Promise<void> {
        if (this.cronQueue && process.env.USE_CLUSTER === 'true') {
            await this.unscheduleFromBullMQ(id);
        } else {
            await this.unscheduleFromNodeCron(id);
        }
    }

    /**
     * remove job from BullMQ
     */
    private async unscheduleFromBullMQ(id: string): Promise<void> {
        try {
            if (!this.cronQueue) return;

            // get all repeatable jobs
            const repeatableJobs = await this.cronQueue.getRepeatableJobs();

            // find the specific job by ID or name
            const jobToRemove = repeatableJobs.find(job => {
                return job.id === id || job.name === `cron-${id}`;
            });

            if (jobToRemove) {
                // prepare removal options with proper type handling
                const removeOptions: { pattern?: string; tz?: string } = {
                    pattern: jobToRemove.pattern,
                };

                // only add timezone if it's not null and not undefined
                if (jobToRemove.tz) {
                    removeOptions.tz = jobToRemove.tz;
                }

                // remove the repeatable job
                await this.cronQueue.removeRepeatable(
                    jobToRemove.name || `cron-${id}`,
                    removeOptions,
                    jobToRemove.id || undefined
                );

                console.log(`🛑 Unscheduled BullMQ job ${id}`);
            } else {
                // fallback: try to remove by name pattern
                try {
                    await this.cronQueue.removeRepeatable(`cron-${id}`, {});
                    console.log(`🛑 Unscheduled BullMQ job ${id} (fallback method)`);
                } catch (fallbackError) {
                    console.warn(`⚠️ Could not find repeatable job ${id} to remove`);
                }
            }

            // clean up any remaining jobs with this cronJobId
            const jobTypes = ['waiting', 'delayed', 'active', 'completed', 'failed'] as const;
            for (const jobType of jobTypes) {
                try {
                    const jobs = await this.cronQueue.getJobs([jobType], 0, 100);
                    const jobsToRemove = jobs.filter(job =>
                        job.data && job.data.cronJobId === id
                    );

                    for (const job of jobsToRemove) {
                        await job.remove();
                        console.log(`🛑 Removed ${jobType} job for CRON ${id}`);
                    }
                } catch (cleanupError) {
                    // ignore cleanup errors for non-critical operations
                    console.debug(`Debug: Could not clean ${jobType} jobs for ${id}`);
                }
            }

        } catch (error) {
            console.error(`❌ Failed to unschedule BullMQ job ${id}:`, error);
        }
    }

    /**
     * stop node-cron task
     */
    private async unscheduleFromNodeCron(id: string): Promise<void> {
        const task = this.tasks.get(id);
        if (task) {
            task.stop();
            this.tasks.delete(id);
            console.log(`🛑 Unscheduled node-cron job ${id}`);
        }
    }

    /**
     * get service status
     */
    getServiceStatus(): {
        isInitialized: boolean;
        clusterMode: boolean;
        activeTasks: number;
        totalJobs: number;
    } {
        return {
            isInitialized: this.isInitialized,
            clusterMode: process.env.USE_CLUSTER === 'true',
            activeTasks: this.tasks.size,
            totalJobs: CronJobModel.findAll().length,
        };
    }

    /**
     * gracefully shutdown the service
     */
    async shutdown(): Promise<void> {
        console.log('🔄 Shutting down CRON job manager...');

        // stop all node-cron tasks
        for (const [id, task] of this.tasks) {
            task.stop();
            console.log(`🛑 Stopped task ${id}`);
        }
        this.tasks.clear();

        // close BullMQ connections
        if (this.worker) {
            await this.worker.close();
            console.log('🛑 Closed BullMQ worker');
        }
        if (this.cronQueue) {
            await this.cronQueue.close();
            console.log('🛑 Closed BullMQ queue');
        }

        this.isInitialized = false;
        console.log('✅ CRON job manager shutdown complete');
    }
}

export const cronJobManager = new CronJobManager();

export { CronJobManager };

export default cronJobManager;