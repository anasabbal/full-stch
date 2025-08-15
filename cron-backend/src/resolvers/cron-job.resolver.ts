import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { CronJobManagerService } from '../services/cron-job-manager.service';
import { CronJobType, ServiceStatusType } from '../graphql/cron-job.type';
import { CreateCronJobDto } from '../dto/create-cron-job.dto';
import { UpdateCronJobDto } from '../dto/update-cron-job.dto';

@Resolver(() => CronJobType)
export class CronJobResolver {
    private readonly logger = new Logger(CronJobResolver.name);

    constructor(private cronJobManagerService: CronJobManagerService) {}

    @Query(() => [CronJobType])
    async cronJobs(): Promise<CronJobType[]> {
        try {
            return this.cronJobManagerService.getAllCronJobs().map(job => ({
                ...job,
                createdAt: job.createdAt.toISOString(),
                updatedAt: job.updatedAt.toISOString(),
                lastRun: job.lastRun?.toISOString(),
                nextRun: job.nextRun?.toISOString(),
            }));
        } catch (error) {
            this.logger.error('Error fetching cron jobs:', error);
            throw new Error('Failed to fetch cron jobs');
        }
    }

    @Query(() => CronJobType, { nullable: true })
    async cronJob(@Args('id', { type: () => ID }) id: string): Promise<CronJobType | null> {
        try {
            const job = this.cronJobManagerService.getCronJobById(id);
            if (!job) {
                throw new Error(`Cron job with id ${id} not found`);
            }
            return {
                ...job,
                createdAt: job.createdAt.toISOString(),
                updatedAt: job.updatedAt.toISOString(),
                lastRun: job.lastRun?.toISOString(),
                nextRun: job.nextRun?.toISOString(),
            };
        } catch (error) {
            this.logger.error(`Error fetching cron job ${id}:`, error);
            throw error;
        }
    }

    @Query(() => String)
    async health(): Promise<string> {
        const status = this.cronJobManagerService.getServiceStatus();
        return `Cron service is ${status.isInitialized ? 'running' : 'initializing'} - ${new Date().toISOString()}`;
    }

    @Query(() => ServiceStatusType)
    async serviceStatus(): Promise<ServiceStatusType> {
        return this.cronJobManagerService.getServiceStatus();
    }

    @Mutation(() => CronJobType)
    async createCronJob(@Args('input') input: CreateCronJobDto): Promise<CronJobType> {
        try {
            const job = await this.cronJobManagerService.createCronJob(input);
            return {
                ...job,
                createdAt: job.createdAt.toISOString(),
                updatedAt: job.updatedAt.toISOString(),
                lastRun: job.lastRun?.toISOString(),
                nextRun: job.nextRun?.toISOString(),
            };
        } catch (error: any) {
            this.logger.error('Error creating cron job:', error);
            throw new Error(`Failed to create cron job: ${error.message}`);
        }
    }

    @Mutation(() => CronJobType, { nullable: true })
    async updateCronJob(@Args('input') input: UpdateCronJobDto): Promise<CronJobType | null> {
        try {
            const result = await this.cronJobManagerService.updateCronJob(input);
            if (!result) {
                throw new Error(`Cron job with id ${input.id} not found`);
            }
            return {
                ...result,
                createdAt: result.createdAt.toISOString(),
                updatedAt: result.updatedAt.toISOString(),
                lastRun: result.lastRun?.toISOString(),
                nextRun: result.nextRun?.toISOString(),
            };
        } catch (error: any) {
            this.logger.error(`Error updating cron job ${input.id}:`, error);
            throw error;
        }
    }

    @Mutation(() => Boolean)
    async deleteCronJob(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
        try {
            return await this.cronJobManagerService.deleteCronJob(id);
        } catch (error: any) {
            this.logger.error(`Error deleting cron job ${id}:`, error);
            throw new Error(`Failed to delete cron job: ${error.message}`);
        }
    }
}