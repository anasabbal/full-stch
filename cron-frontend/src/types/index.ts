export interface CronJob {
    id: string;
    uri: string;
    httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: string;
    schedule: string;
    timeZone: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    lastRun?: string;
    nextRun?: string;
}

export interface CreateCronInput {
    uri: string;
    httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: string;
    schedule: string;
    timeZone: string;
}

export interface UpdateCronInput {
    id: string;
    uri?: string;
    httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: string;
    schedule?: string;
    timeZone?: string;
    isActive?: boolean;
}

export interface ServiceStatus {
    isInitialized: boolean;
    clusterMode: boolean;
    activeTasks: number;
    totalJobs: number;
}
// Add GraphQL response types
export interface GetCronJobsData {
    cronJobs: CronJob[];
}

export interface GetCronJobData {
    cronJob: CronJob;
}

export interface CreateCronJobData {
    createCronJob: CronJob;
}

export interface UpdateCronJobData {
    updateCronJob: CronJob;
}

export interface DeleteCronJobData {
    deleteCronJob: boolean;
}

export interface ServiceStatusData {
    serviceStatus: ServiceStatus;
}

export interface HealthCheckData {
    health: string;
}
