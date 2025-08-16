import express from 'express';
import { setupSwagger } from './config/swagger';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { typeDefs } from './schemas/cronSchema';
import { resolvers } from './resolvers/cronResolvers';
import { cronJobManager } from './services/cron.manager';
import { closeRedisConnection } from './config/database';

dotenv.config();

/**
 * start the express + apollo graphql server
 * sets up rest endpoints, graphql endpoint, and graceful shutdown handling
 */
async function startServer() {
    const app = express();
    const port = process.env.PORT || 4000;

    // create http server
    const httpServer = http.createServer(app);

    // create apollo server instance
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: true,
        plugins: [
            // enable proper shutdown for the http server
            ApolloServerPluginDrainHttpServer({ httpServer }),
            // custom plugin to stop cron jobs when server shuts down
            {
                async serverWillStart() {
                    return {
                        async drainServer() {
                            console.log('🔄 draining cron service...');
                            await cronJobManager.shutdown();
                        },
                    };
                },
            },
        ],
    });

    // start apollo server
    await server.start();

    // apply express middlewares
    app.use(cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    }));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    setupSwagger(app);

    /**
     * @swagger
     * /health:
     *   get:
     *     summary: Health check
     *     description: Check if the CRON service is running properly
     *     responses:
     *       200:
     *         description: Service is healthy
     *       500:
     *         description: Service error
     */
    app.get('/health', (req, res) => {
        try {
            const status = cronJobManager.getServiceStatus();
            res.json({
                status: status.isInitialized ? 'ok' : 'initializing',
                timestamp: new Date().toISOString(),
                service: 'cron backend',
                version: '1.0.0',
                ...status
            });
        } catch (error: any) {
            res.status(500).json({
                status: 'error',
                message: error.message,
                timestamp: new Date().toISOString(),
            });
        }
    });

    /**
     * @swagger
     * /status:
     *   get:
     *     summary: Service status
     *     description: Get detailed service status including memory and job info
     *     responses:
     *       200:
     *         description: Detailed service status
     *       500:
     *         description: Failed to get status
     */
    app.get('/status', (req, res) => {
        try {
            const status = cronJobManager.getServiceStatus();
            res.json({
                ...status,
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version,
                platform: process.platform,
            });
        } catch (error: any) {
            res.status(500).json({
                error: 'failed to get status',
                message: error.message,
                timestamp: new Date().toISOString(),
            });
        }
    });

    // apply graphql middleware
    app.use('/graphql',
        cors<cors.CorsRequest>(),
        express.json(),
        expressMiddleware(server, {
            context: async ({ req }) => {
                return {
                    timestamp: new Date().toISOString(),
                };
            },
        })
    );

    // fallback for non-existent routes
    app.use('*', (req, res) => {
        res.status(404).json({
            error: 'not found',
            message: `cannot ${req.method} ${req.originalUrl}`,
            availableEndpoints: [
                'post /graphql',
                'get /health',
                'get /status',
            ],
        });
    });

    // start listening for requests
    await new Promise<void>((resolve) => {
        httpServer.listen({ port }, () => {
            console.log(`🚀 server ready at http://localhost:${port}/graphql`);
            console.log(`📊 health check at http://localhost:${port}/health`);
            console.log(`📋 status endpoint at http://localhost:${port}/status`);
            console.log(`🔧 environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔄 cluster mode: ${process.env.USE_CLUSTER === 'true' ? 'enabled' : 'disabled'}`);
            resolve();
        });
    });

    /**
     * handle graceful shutdown
     */
    const gracefulShutdown = async (signal: string) => {
        console.log(`\n${signal} received, shutting down gracefully...`);

        try {
            // stop apollo server
            await server.stop();
            console.log('✅ apollo server stopped');

            // close http server
            await new Promise<void>((resolve, reject) => {
                httpServer.close((err) => {
                    if (err) reject(err);
                    else {
                        console.log('✅ http server closed');
                        resolve();
                    }
                });
            });

            // stop cron jobs
            await cronJobManager.shutdown();
            console.log('✅ cron service stopped');

            // close redis
            await closeRedisConnection();
            console.log('✅ redis connection closed');

            console.log('✅ graceful shutdown complete');
            process.exit(0);
        } catch (error) {
            console.error('❌ error during shutdown:', error);
            process.exit(1);
        }
    };

    // register signal listeners for termination
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return { server, app, httpServer };
}

// global error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ uncaught exception:', error);
    process.exit(1);
});

// bootstrap the server
startServer().catch((error) => {
    console.error('❌ failed to start server:', error);
    process.exit(1);
});
