import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { WebhookController } from './controllers/webhook.controller';
import { LogService } from './services/log.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'public'),
            serveRoot: '/static',
        }),
    ],
    controllers: [WebhookController],
    providers: [LogService],
})
export class AppModule {}