import { cronJobManager } from '../services/cron.manager';
import { CreateCronInput, UpdateCronInput } from '../types';

export const resolvers = {
    Query: {
        // get all cron jobs
        cronJobs: () => {
            try {
                return cronJobManager.getAllCronJobs();
            } catch (error) {
                console.error('error fetching cron jobs:', error);
                throw new Error('failed to fetch cron jobs');
            }
        },

        // get a single cron job by id
        cronJob: (_: any, { id }: { id: string }) => {
            try {
                const job = cronJobManager.getCronJobById(id);
                if (!job) {
                    throw new Error(`cron job with id ${id} not found`);
                }
                return job;
            } catch (error) {
                console.error(`error fetching cron job ${id}:`, error);
                throw error;
            }
        },

        // return service health status in a readable string
        health: () => {
            const status = cronJobManager.getServiceStatus();
            return `cron service is ${status.isInitialized ? 'running' : 'initializing'} - ${new Date().toISOString()}`;
        },

        // return raw service status object
        serviceStatus: () => {
            return cronJobManager.getServiceStatus();
        },
    },

    Mutation: {
        // create a new cron job
        createCronJob: async (_: any, { input }: { input: CreateCronInput }) => {
            try {
                return await cronJobManager.createCronJob(input);
            } catch (error: any) {
                console.error('error creating cron job:', error);
                throw new Error(`failed to create cron job: ${error.message}`);
            }
        },

        // update an existing cron job
        updateCronJob: async (_: any, { input }: { input: UpdateCronInput }) => {
            try {
                const result = await cronJobManager.updateCronJob(input);
                if (!result) {
                    throw new Error(`cron job with id ${input.id} not found`);
                }
                return result;
            } catch (error: any) {
                console.error(`error updating cron job ${input.id}:`, error);
                throw error;
            }
        },

        // delete a cron job by id
        deleteCronJob: async (_: any, { id }: { id: string }) => {
            try {
                return await cronJobManager.deleteCronJob(id);
            } catch (error: any) {
                console.error(`error deleting cron job ${id}:`, error);
                throw new Error(`failed to delete cron job: ${error.message}`);
            }
        },
    },
};
