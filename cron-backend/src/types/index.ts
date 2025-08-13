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