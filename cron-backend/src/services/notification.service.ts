import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    async notify(uri: string, method: string, body?: string): Promise<void> {
        const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const payload = body ? `${timestamp} - ${body}` : `${timestamp} - cron triggered`;

        const requestConfig = {
            method: method.toLowerCase() as 'get' | 'post' | 'put' | 'delete',
            url: uri,
            timeout: 10000,
            headers: {
                'content-type': 'application/json',
                'user-agent': 'cron-service-nestjs/1.0.0',
            },
            ...(method !== 'GET' && {
                data: {
                    message: payload,
                    timestamp: new Date().toISOString(),
                    cronJob: true
                }
            }),
        };

        try {
            this.logger.log(`🔄 Sending ${method} request to ${uri}...`);
            const response = await axios(requestConfig);
            this.logger.log(`✅ Notification sent to ${uri}: ${payload} (status: ${response.status})`);

            if (response.data) {
                this.logger.log(`📥 Response: ${JSON.stringify(response.data)}`);
            }
        } catch (error: any) {
            if (error.code === 'ECONNREFUSED') {
                this.logger.error(`❌ Connection refused to ${uri} - service may not be running`);
            } else if (error.code === 'ETIMEDOUT') {
                this.logger.error(`❌ Timeout connecting to ${uri}`);
            } else if (error.response) {
                this.logger.error(`❌ HTTP ${error.response.status} from ${uri}: ${error.response.statusText}`);
                if (error.response.data) {
                    this.logger.error(`📥 Error response: ${JSON.stringify(error.response.data)}`);
                }
            } else if (error.request) {
                this.logger.error(`❌ No response from ${uri}`, {
                    method: method,
                    url: uri,
                    timeout: requestConfig.timeout
                });
            } else {
                this.logger.error(`❌ Request setup error for ${uri}: ${error.message}`);
            }
        }
    }
}