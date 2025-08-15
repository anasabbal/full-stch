import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    try {
        const app = await NestFactory.create(AppModule, {
            cors: true,
        });

        const configService = app.get(ConfigService);

        app.useGlobalPipes(new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            disableErrorMessages: false,
            validationError: {
                target: false,
                value: false,
            },
        }));

        app.enableCors({
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Apollo-Require-Preflight'],
            credentials: true,
        });

        const port = configService.get('PORT') || 4000;

        await app.listen(port);

        logger.log(`🚀 Server ready at http://localhost:${port}/graphql`);
        logger.log(`📊 Health check at http://localhost:${port}/health`);
        logger.log(`📋 Status endpoint at http://localhost:${port}/status`);
        logger.log(`🔧 Environment: ${configService.get('NODE_ENV') || 'development'}`);
        logger.log(`🔄 Cluster mode: ${configService.get('USE_CLUSTER') === 'true' ? 'enabled' : 'disabled'}`);
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

bootstrap();