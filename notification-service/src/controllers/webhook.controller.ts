import { Controller, Post, Get, Body, Req, Res, Logger, Query } from '@nestjs/common';
import { Request, Response } from 'express';
import { LogService } from '../services/log.service';
import { WebhookDto } from '../dto/webhook.dto';

@Controller()
export class WebhookController {
    private readonly logger = new Logger(WebhookController.name);

    constructor(private logService: LogService) {}

    @Post('webhook')
    handleWebhook(@Body() body: WebhookDto, @Req() req: Request, @Res() res: Response) {
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';

        const logEntry = this.logService.addLog({
            method: req.method,
            url: req.originalUrl,
            headers: req.headers,
            body: body,
            userAgent,
            ip: clientIp,
            message: body?.message || 'Webhook received',
        });

        this.logger.log(`🎯 Webhook received from ${clientIp}: ${body?.message || 'No message'}`);

        const response = {
            success: true,
            message: 'Webhook received successfully',
            timestamp: new Date().toISOString(),
            logId: logEntry.id,
            receivedData: body,
        };

        res.status(200).json(response);
    }

    @Get('logs')
    getLogs(@Query('limit') limit?: string) {
        const limitNum = limit ? parseInt(limit, 10) : 50;
        return {
            logs: this.logService.getRecentLogs(limitNum),
            total: this.logService.getLogCount(),
            timestamp: new Date().toISOString(),
        };
    }

    @Get('logs/all')
    getAllLogs() {
        return {
            logs: this.logService.getAllLogs(),
            total: this.logService.getLogCount(),
            timestamp: new Date().toISOString(),
        };
    }

    @Post('logs/clear')
    clearLogs() {
        this.logService.clearLogs();
        return {
            success: true,
            message: 'All logs cleared',
            timestamp: new Date().toISOString(),
        };
    }

    @Get('health')
    getHealth() {
        return {
            status: 'ok',
            service: 'notification-service-nestjs',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            logCount: this.logService.getLogCount(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        };
    }

    @Get('status')
    getStatus() {
        return {
            service: 'notification-service-nestjs',
            status: 'running',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            logs: {
                total: this.logService.getLogCount(),
                recent: this.logService.getRecentLogs(5),
            },
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version,
                platform: process.platform,
            },
        };
    }

    @Get('test')
    handleGetTest(@Req() req: Request) {
        this.logService.addLog({
            method: req.method,
            url: req.originalUrl,
            headers: req.headers,
            body: req.query,
            userAgent: req.get('User-Agent') || 'unknown',
            ip: req.ip || 'unknown',
            message: 'GET test endpoint called',
        });

        return {
            message: 'GET test successful',
            timestamp: new Date().toISOString(),
            query: req.query,
        };
    }

    @Post('test')
    handlePostTest(@Body() body: any, @Req() req: Request) {
        this.logService.addLog({
            method: req.method,
            url: req.originalUrl,
            headers: req.headers,
            body: body,
            userAgent: req.get('User-Agent') || 'unknown',
            ip: req.ip || 'unknown',
            message: 'POST test endpoint called',
        });

        return {
            message: 'POST test successful',
            timestamp: new Date().toISOString(),
            receivedBody: body,
        };
    }
}