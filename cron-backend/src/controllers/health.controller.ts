import { Controller, Get } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { CronJobManagerService } from '../services/cron-job-manager.service';

@Controller()
export class HealthController {
    private readonly logger = new Logger(HealthController.name);

    constructor(private cronJobManagerService: CronJobManagerService) {}

    @Get('health')
    getHealth() {
        try {
            const status = this.cronJobManagerService.getServiceStatus();
            return {
                status: status.isInitialized ? 'ok' : 'initializing',
                timestamp: new Date().toISOString(),
                service: 'cron backend nestjs',
                version: '1.0.0',
                ...status
            };
        } catch (error: any) {
            return {
                status: 'error',
                message: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }

    @Get('status')
    getStatus() {
        try {
            const status = this.cronJobManagerService.getServiceStatus();
            return {
                ...status,
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version,
                platform: process.platform,
            };
        } catch (error: any) {
            return {
                error: 'failed to get status',
                message: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }
}