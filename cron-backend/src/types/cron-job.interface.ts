export interface CronJob {
    id: string;
    uri: string;
    httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: string;
    schedule: string;
    timeZone: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastRun?: Date;
    nextRun?: Date;
}

export interface ServiceStatus {
    isInitialized: boolean;
    clusterMode: boolean;
    activeTasks: number;
    totalJobs: number;
}