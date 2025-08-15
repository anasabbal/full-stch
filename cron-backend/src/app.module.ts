import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { CronJobManagerService } from './services/cron-job-manager.service';
import { NotificationService } from './services/notification.service';
import { DatabaseService } from './config/database.service';
import { CronJobModel } from './models/cron-job.model';
import { CronJobResolver } from './resolvers/cron-job.resolver';
import { HealthController } from './controllers/health.controller';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            autoSchemaFile: true,
            introspection: true,
            playground: true,
            context: ({ req }) => ({
                timestamp: new Date().toISOString(),
            }),
        }),
    ],
    controllers: [HealthController],
    providers: [
        CronJobManagerService,
        NotificationService,
        DatabaseService,
        CronJobModel,
        CronJobResolver,
    ],
    exports: [CronJobManagerService],
})
export class AppModule {}