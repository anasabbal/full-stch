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