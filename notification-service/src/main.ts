import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    app.useGlobalPipes(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
    }));

    app.enableCors({
        origin: ['http://localhost:3000', 'http://localhost:4000', 'http://127.0.0.1:3000', 'http://127.0.0.1:4000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    const port = configService.get('PORT') || 3001;

    await app.listen(port);

    logger.log(`🚀 Notification Service ready at http://localhost:${port}`);
    logger.log(`📨 Webhook endpoint: http://localhost:${port}/webhook`);
    logger.log(`📋 Logs endpoint: http://localhost:${port}/logs`);
    logger.log(`💚 Health check: http://localhost:${port}/health`);
    logger.log(`📊 Status: http://localhost:${port}/status`);
}

bootstrap().catch((error) => {
    console.error('❌ Failed to start notification service:', error);
    process.exit(1);
});