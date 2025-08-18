import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { setupSwagger } from './config/swagger';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
setupSwagger(app);

// ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * logs incoming requests to console and file with timestamp, ip, and metadata
 * @param req - express request object
 * @param method - http method of the request
 * @param body - optional request body to log
 * @returns the log entry object
 */
const logRequest = (req: express.Request, method: string, body?: any) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    let logMessage = `${timestamp} - ${method} request from ${ip}`;

    if (body && body.message) {
        logMessage = body.message;
    } else if (body && Object.keys(body).length > 0) {
        logMessage = `${timestamp} - ${method} request: ${JSON.stringify(body)}`;
    }

    const logEntry = {
        timestamp: new Date().toISOString(),
        method,
        ip,
        userAgent,
        body,
        logMessage
    };

    const colors = {
        GET: '\x1b[32m',
        POST: '\x1b[34m',
        PUT: '\x1b[33m',
        DELETE: '\x1b[31m',
        RESET: '\x1b[0m'
    };

    const color = colors[method as keyof typeof colors] || colors.RESET;
    console.log(`${color}📨 [${method}] ${logMessage}${colors.RESET}`);

    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `notifications-${today}.log`);

    try {
        const fileLogEntry = `${JSON.stringify(logEntry)}\n`;
        fs.appendFileSync(logFile, fileLogEntry);
    } catch (error) {
        console.error('❌ failed to write to log file:', error);
    }

    return logEntry;
};

/**
 * @swagger
 * /:
 *   get:
 *     summary: Service information
 *     description: Get service info and available endpoints
 *     responses:
 *       200:
 *         description: Service information
 */
app.get('/', (req, res) => {
    res.json({
        service: 'cron notification service',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            webhook: '/webhook',
            health: '/health',
            logs: '/logs',
            test: '/test'
        }
    });
});

/**
 * @swagger
 * /webhook:
 *   post:
 *     summary: Webhook endpoint
 *     description: Receive webhook notifications from CRON jobs
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "CRON job completed successfully"
 *     responses:
 *       200:
 *         description: Notification received successfully
 *       500:
 *         description: Internal server error
 *   get:
 *     summary: Test webhook (GET)
 *     responses:
 *       200:
 *         description: GET webhook test successful
 *   put:
 *     summary: Test webhook (PUT)
 *     responses:
 *       200:
 *         description: PUT webhook test successful
 *   delete:
 *     summary: Test webhook (DELETE)
 *     responses:
 *       200:
 *         description: DELETE webhook test successful
 */
app.all('/webhook', (req, res) => {
    try {
        const logEntry = logRequest(req, req.method, req.body);
        res.status(200).json({
            success: true,
            message: 'notification received successfully',
            timestamp: logEntry.timestamp,
            method: req.method,
            receivedData: req.body,
            loggedAt: logEntry.timestamp
        });
    } catch (error: any) {
        console.error('❌ error processing webhook:', error);
        res.status(500).json({
            success: false,
            error: 'internal server error',
            timestamp: new Date().toISOString()
        });
    }
});

// test endpoints for get, post, put, and delete
app.get('/test', (req, res) => {
    const logEntry = logRequest(req, 'GET', { test: 'get request test' });
    res.json({ message: 'get test successful', ...logEntry });
});

app.post('/test', (req, res) => {
    const logEntry = logRequest(req, 'POST', req.body || { test: 'post request test' });
    res.json({ message: 'post test successful', ...logEntry });
});

app.put('/test', (req, res) => {
    const logEntry = logRequest(req, 'PUT', req.body || { test: 'put request test' });
    res.json({ message: 'put test successful', ...logEntry });
});

app.delete('/test', (req, res) => {
    const logEntry = logRequest(req, 'DELETE', req.body || { test: 'delete request test' });
    res.json({ message: 'delete test successful', ...logEntry });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Get service health status and metrics
 *     responses:
 *       200:
 *         description: Service is healthy
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'notification service',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        port: port
    });
});

/**
 * @swagger
 * /logs:
 *   get:
 *     summary: Get logs
 *     description: Retrieve recent log entries
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of log entries to return
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for logs (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Log entries retrieved successfully
 *       500:
 *         description: Failed to read logs
 */
app.get('/logs', (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const date = req.query.date as string || new Date().toISOString().split('T')[0];
        const logFile = path.join(logsDir, `notifications-${date}.log`);

        if (!fs.existsSync(logFile)) {
            return res.json({
                logs: [],
                date,
                message: `no logs found for ${date}`
            });
        }

        const logContent = fs.readFileSync(logFile, 'utf8');
        const logLines = logContent.trim().split('\n').filter(Boolean);

        const logs = logLines
            .slice(-limit)
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return { message: line, timestamp: new Date().toISOString() };
                }
            })
            .reverse();

        res.json({
            logs,
            date,
            count: logs.length,
            totalCount: logLines.length
        });
    } catch (error: any) {
        console.error('❌ error reading logs:', error);
        res.status(500).json({
            error: 'failed to read logs',
            message: error.message
        });
    }
});

// 404 handler triggered when endpoint is not found
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'endpoint not found',
        message: `${req.method} ${req.originalUrl} is not a valid endpoint`,
        availableEndpoints: [
            'get /',
            'all /webhook',
            'get /health',
            'get /logs',
            'get|post|put|delete /test'
        ]
    });
});

// global error handler - catches unhandled errors in express routes
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ unhandled error:', error);
    res.status(500).json({
        error: 'internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

