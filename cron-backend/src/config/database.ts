import Redis from 'ioredis';

let redisClient: Redis | null = null;

export const getRedisClient = async (): Promise<Redis | null> => {
    if (process.env.USE_CLUSTER !== 'true') {
        return null;
    }
    if (!redisClient) {
        try {
            redisClient = new Redis(
                parseInt(process.env.REDIS_PORT || '6379'),
                process.env.REDIS_HOST || 'localhost',
                {
                    maxRetriesPerRequest: null,
                }
            );

            // wait for redis to be ready or fail within timeout
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('redis connection timeout'));
                }, 10000);

                redisClient!.once('ready', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                redisClient!.once('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

            console.log('✅ connected to redis with ioredis');
        } catch (error) {
            console.error('❌ failed to connect to redis:', error);
            if (redisClient) {
                redisClient.disconnect();
            }
            redisClient = null;
        }
    }

    return redisClient;
};

export const closeRedisConnection = async (): Promise<void> => {
    // close redis connection if exists
    if (redisClient) {
        try {
            redisClient.disconnect();
            console.log('✅ redis connection closed');
        } catch (error) {
            console.error('❌ error closing redis connection:', error);
        } finally {
            redisClient = null;
        }
    }
};
