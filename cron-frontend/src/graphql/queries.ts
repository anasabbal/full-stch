import { gql } from '@apollo/client';

export const GET_CRON_JOBS = gql`
  query GetCronJobs {
    cronJobs {
      id
      uri
      httpMethod
      body
      schedule
      timeZone
      isActive
      createdAt
      updatedAt
      lastRun
      nextRun
    }
  }
`;

export const GET_CRON_JOB = gql`
  query GetCronJob($id: ID!) {
    cronJob(id: $id) {
      id
      uri
      httpMethod
      body
      schedule
      timeZone
      isActive
      createdAt
      updatedAt
      lastRun
      nextRun
    }
  }
`;

export const HEALTH_CHECK = gql`
  query HealthCheck {
    health
  }
`;

export const SERVICE_STATUS = gql`
  query ServiceStatus {
    serviceStatus {
      isInitialized
      clusterMode
      activeTasks
      totalJobs
    }
  }
`;