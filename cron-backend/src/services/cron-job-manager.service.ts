import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cron from 'node-cron';
import { Queue, Worker, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import * as moment from 'moment-timezone';
import { CronJob, ServiceStatus } from '../types/cron-job.interface';
import { CreateCronJobDto } from '../dto/create-cron-job.dto';
import { UpdateCronJobDto } from '../dto/update-cron-job.dto';
import { CronJobModel } from '../models/cron-job.model';
import { NotificationService } from './notification.service';
import { DatabaseService } from '../config/database.service';

@Injectable()
export class CronJobManagerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CronJobManagerService.name);
    private tasks: Map<string, cron.ScheduledTask> = new Map();
    private cronQueue: Queue | null = null;
    private worker: Worker | null = null;
    private isInitialized: boolean = false;

    constructor(
        private configService: ConfigService,
        private cronJobModel: CronJobModel,
        private notificationService: NotificationService,
        private databaseService: DatabaseService,
    ) {}

    async onModuleInit() {
        await this.initializeClusterSupport();
    }

    async onModuleDestroy() {
        await this.shutdown();
    }

    private async initializeClusterSupport(): Promise<void> {
        if (this.configService.get('USE_CLUSTER') === 'true') {
            try {
                const redis = await this.databaseService.getRedisClient();
                if (redis) {
                    this.cronQueue = new Queue('cron-jobs', { connection: redis });

                    this.worker = new Worker('cron-jobs', async (job: Job) => {
                        const { cronJobId } = job.data;
                        await this.executeCronJob(cronJobId);
                    }, { connection: redis });

                    this.isInitialized = true;
                    this.logger.log('✅ BullMQ cluster support initialized');
                }
            } catch (error) {
                this.logger.error('❌ Failed to initialize cluster support:', error);
                this.isInitialized = false;
            }
        } else {
            this.isInitialized = true;
            this.logger.log('✅ Single-instance mode initialized');
        }
    }

    private async executeCronJob(cronJobId: string): Promise<void> {
        const cronJob = this.cronJobModel.findById(cronJobId);

        if (cronJob && cronJob.isActive) {
            try {
                await this.notificationService.notify(cronJob.uri, cronJob.httpMethod, cronJob.body);

                const now = new Date();
                const nextRun = this.calculateNextRunTime(cronJob.schedule, cronJob.timeZone);

                this.cronJobModel.update(cronJobId, {
                    lastRun: now,
                    nextRun: nextRun
                });

                this.logger.log(`✅ CRON job ${cronJobId} executed successfully. Next run: ${nextRun}`);
            } catch (error) {
                this.logger.error(`❌ CRON job ${cronJobId} failed:`, error);
            }
        }
    }

    private calculateNextRunTime(schedule: string, timeZone: string): Date | undefined {
        try {
            const cronParts = schedule.trim().split(/\s+/);
            if (cronParts.length !== 5) {
                this.logger.error('Invalid CRON expression:', schedule);
                return undefined;
            }

            const [minute, hour, day, month, weekday] = cronParts;

            // Use moment-timezone properly
            const now = moment().tz(timeZone || 'UTC');
            let nextRun = now.clone();

            if (schedule === '* * * * *') {
                return nextRun.add(1, 'minute').seconds(0).milliseconds(0).toDate();
            }

            if (minute.startsWith('*/')) {
                const interval = parseInt(minute.substring(2));
                const currentMinute = now.minute();
                const nextMinute = Math.ceil((currentMinute + 1) / interval) * interval;

                nextRun.minute(nextMinute).second(0).millisecond(0);

                if (nextMinute >= 60) {
                    nextRun.add(1, 'hour').minute(nextMinute - 60);
                }

                return nextRun.toDate();
            }

            if (minute !== '*') {
                const targetMinute = parseInt(minute);
                if (targetMinute > now.minute()) {
                    nextRun.minute(targetMinute).second(0).millisecond(0);
                } else {
                    nextRun.add(1, 'hour').minute(targetMinute).second(0).millisecond(0);
                }
            }

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
            this.logger.error('Failed to calculate next run time:', error);
            // Fallback: add 1 minute from current time in specified timezone
            try {
                return moment().tz(timeZone || 'UTC').add(1, 'minute').toDate();
            } catch (fallbackError) {
                this.logger.error('Fallback calculation also failed:', fallbackError);
                // Ultimate fallback: add 1 minute from current UTC time
                return new Date(Date.now() + 60000);
            }
        }
    }

    async createCronJob(input: CreateCronJobDto): Promise<CronJob> {
        if (!cron.validate(input.schedule)) {
            throw new Error('Invalid CRON expression');
        }

        const id = uuidv4();
        const now = new Date();

        // Validate timezone
        const validatedTimeZone = this.validateTimeZone(input.timeZone);

        const cronJob: CronJob = {
            id,
            ...input,
            timeZone: validatedTimeZone,
            isActive: true,
            createdAt: now,
            updatedAt: now,
            nextRun: this.calculateNextRunTime(input.schedule, validatedTimeZone),
        };

        this.cronJobModel.create(cronJob);
        await this.scheduleJob(cronJob);

        this.logger.log(`✅ Created CRON job ${id} with schedule: ${input.schedule}`);
        this.logger.log(`📅 Next run calculated as: ${cronJob.nextRun}`);
        return cronJob;
    }

    private validateTimeZone(timeZone: string): string {
        try {
            // Test if the timezone is valid by creating a moment with it
            moment().tz(timeZone);
            return timeZone;
        } catch (error) {
            this.logger.warn(`Invalid timezone ${timeZone}, falling back to UTC`);
            return 'UTC';
        }
    }

    async updateCronJob(input: UpdateCronJobDto): Promise<CronJob | null> {
        const existingJob = this.cronJobModel.findById(input.id);
        if (!existingJob) {
            throw new Error(`CRON job with id ${input.id} not found`);
        }

        if (input.schedule && !cron.validate(input.schedule)) {
            throw new Error('Invalid CRON expression');
        }

        await this.unscheduleJob(input.id);

        let nextRun = existingJob.nextRun;
        if (input.schedule) {
            const validatedTimeZone = input.timeZone ? this.validateTimeZone(input.timeZone) : existingJob.timeZone;
            nextRun = this.calculateNextRunTime(input.schedule, validatedTimeZone);
        }

        const updatedJob = this.cronJobModel.update(input.id, {
            ...input,
            ...(input.timeZone && { timeZone: this.validateTimeZone(input.timeZone) }),
            nextRun: nextRun,
        });

        if (updatedJob && updatedJob.isActive) {
            await this.scheduleJob(updatedJob);
        }

        this.logger.log(`✅ Updated CRON job ${input.id}`);
        if (input.schedule) {
            this.logger.log(`📅 New next run calculated as: ${nextRun}`);
        }
        return updatedJob;
    }

    async deleteCronJob(id: string): Promise<boolean> {
        const job = this.cronJobModel.findById(id);
        if (!job) {
            return false;
        }

        await this.unscheduleJob(id);
        const deleted = this.cronJobModel.delete(id);

        if (deleted) {
            this.logger.log(`✅ Deleted CRON job ${id}`);
        }

        return deleted;
    }

    getAllCronJobs(): CronJob[] {
        return this.cronJobModel.findAll();
    }

    getCronJobById(id: string): CronJob | null {
        return this.cronJobModel.findById(id) || null;
    }

    private async scheduleJob(cronJob: CronJob): Promise<void> {
        if (this.cronQueue && this.configService.get('USE_CLUSTER') === 'true') {
            await this.scheduleWithBullMQ(cronJob);
        } else {
            await this.scheduleWithNodeCron(cronJob);
        }
    }

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
            this.logger.log(`📅 Scheduled CRON job ${cronJob.id} with BullMQ`);
        } catch (error) {
            this.logger.error(`❌ Failed to schedule job ${cronJob.id} with BullMQ:`, error);
            throw error;
        }
    }

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
            this.logger.log(`📅 Scheduled CRON job ${cronJob.id} with node-cron`);
        } catch (error) {
            this.logger.error(`❌ Failed to schedule job ${cronJob.id} with node-cron:`, error);
            throw error;
        }
    }

    private async unscheduleJob(id: string): Promise<void> {
        if (this.cronQueue && this.configService.get('USE_CLUSTER') === 'true') {
            await this.unscheduleFromBullMQ(id);
        } else {
            await this.unscheduleFromNodeCron(id);
        }
    }

    private async unscheduleFromBullMQ(id: string): Promise<void> {
        try {
            if (!this.cronQueue) return;

            const repeatableJobs = await this.cronQueue.getRepeatableJobs();
            const jobToRemove = repeatableJobs.find(job => {
                return job.id === id || job.name === `cron-${id}`;
            });

            if (jobToRemove) {
                const removeOptions: { pattern?: string; tz?: string } = {
                    pattern: jobToRemove.pattern,
                };

                if (jobToRemove.tz) {
                    removeOptions.tz = jobToRemove.tz;
                }

                await this.cronQueue.removeRepeatable(
                    jobToRemove.name || `cron-${id}`,
                    removeOptions,
                    jobToRemove.id || undefined
                );

                this.logger.log(`🛑 Unscheduled BullMQ job ${id}`);
            }

            const jobTypes = ['waiting', 'delayed', 'active', 'completed', 'failed'] as const;
            for (const jobType of jobTypes) {
                try {
                    const jobs = await this.cronQueue.getJobs([jobType], 0, 100);
                    const jobsToRemove = jobs.filter(job =>
                        job.data && job.data.cronJobId === id
                    );

                    for (const job of jobsToRemove) {
                        await job.remove();
                    }
                } catch (cleanupError) {
                    // Ignore cleanup errors
                }
            }
        } catch (error) {
            this.logger.error(`❌ Failed to unschedule BullMQ job ${id}:`, error);
        }
    }

    private async unscheduleFromNodeCron(id: string): Promise<void> {
        const task = this.tasks.get(id);
        if (task) {
            task.stop();
            this.tasks.delete(id);
            this.logger.log(`🛑 Unscheduled node-cron job ${id}`);
        }
    }

    getServiceStatus(): ServiceStatus {
        return {
            isInitialized: this.isInitialized,
            clusterMode: this.configService.get('USE_CLUSTER') === 'true',
            activeTasks: this.tasks.size,
            totalJobs: this.cronJobModel.findAll().length,
        };
    }

    async shutdown(): Promise<void> {
        this.logger.log('🔄 Shutting down CRON job manager...');

        for (const [id, task] of this.tasks) {
            task.stop();
            this.logger.log(`🛑 Stopped task ${id}`);
        }
        this.tasks.clear();

        if (this.worker) {
            await this.worker.close();
            this.logger.log('🛑 Closed BullMQ worker');
        }
        if (this.cronQueue) {
            await this.cronQueue.close();
            this.logger.log('🛑 Closed BullMQ queue');
        }

        this.isInitialized = false;
        this.logger.log('✅ CRON job manager shutdown complete');
    }
}