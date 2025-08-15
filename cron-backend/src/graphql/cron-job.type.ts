import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class CronJobType {
    @Field(() => ID)
    id: string;

    @Field()
    uri: string;

    @Field()
    httpMethod: string;

    @Field({ nullable: true })
    body?: string;

    @Field()
    schedule: string;

    @Field()
    timeZone: string;

    @Field()
    isActive: boolean;

    @Field()
    createdAt: string;

    @Field()
    updatedAt: string;

    @Field({ nullable: true })
    lastRun?: string;

    @Field({ nullable: true })
    nextRun?: string;
}

@ObjectType()
export class ServiceStatusType {
    @Field()
    isInitialized: boolean;

    @Field()
    clusterMode: boolean;

    @Field()
    activeTasks: number;

    @Field()
    totalJobs: number;
}