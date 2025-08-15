export interface LogEntry {
    id: string;
    timestamp: string;
    method: string;
    url: string;
    headers: Record<string, any>;
    body: any;
    userAgent: string;
    ip: string;
    message?: string;
}