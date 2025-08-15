import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
    private readonly logger = new Logger(DatabaseService.name);
    private redisClient: Redis | null = null;

    constructor(private configService: ConfigService) {}

    async getRedisClient(): Promise<Redis | null> {
        if (this.configService.get('USE_CLUSTER') !== 'true') {
            return null;
        }

        if (!this.redisClient) {
            try {
                this.redisClient = new Redis(
                    parseInt(this.configService.get('REDIS_PORT', '6379')),
                    this.configService.get('REDIS_HOST', 'localhost'),
                    {
                        maxRetriesPerRequest: null,
                    }
                );

                await new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Redis connection timeout'));
                    }, 10000);

                    this.redisClient!.once('ready', () => {
                        clearTimeout(timeout);
                        resolve();
                    });

                    this.redisClient!.once('error', (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });

                this.logger.log('✅ Connected to Redis with ioredis');
            } catch (error) {
                this.logger.error('❌ Failed to connect to Redis:', error);
                if (this.redisClient) {
                    this.redisClient.disconnect();
                }
                this.redisClient = null;
            }
        }

        return this.redisClient;
    }

    async onModuleDestroy() {
        await this.closeRedisConnection();
    }

    private async closeRedisConnection(): Promise<void> {
        if (this.redisClient) {
            try {
                this.redisClient.disconnect();
                this.logger.log('✅ Redis connection closed');
            } catch (error) {
                this.logger.error('❌ Error closing Redis connection:', error);
            } finally {
                this.redisClient = null;
            }
        }
    }
}