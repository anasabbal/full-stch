import { gql } from '@apollo/client';

export const CREATE_CRON_JOB = gql`
  mutation CreateCronJob($input: CreateCronInput!) {
    createCronJob(input: $input) {
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

export const UPDATE_CRON_JOB = gql`
  mutation UpdateCronJob($input: UpdateCronInput!) {
    updateCronJob(input: $input) {
      id
      uri
      httpMethod
      body
      schedule
      timeZone
      isActive
      updatedAt
      lastRun
      nextRun
    }
  }
`;

export const DELETE_CRON_JOB = gql`
  mutation DeleteCronJob($id: ID!) {
    deleteCronJob(id: $id)
  }
`;