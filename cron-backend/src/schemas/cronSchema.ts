import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type CronJob {
    id: ID!
    uri: String!
    httpMethod: String!
    body: String
    schedule: String!
    timeZone: String!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
    lastRun: String
    nextRun: String
  }

  type ServiceStatus {
    isInitialized: Boolean!
    clusterMode: Boolean!
    activeTasks: Int!
    totalJobs: Int!
  }

  input CreateCronInput {
    uri: String!
    httpMethod: String!
    body: String
    schedule: String!
    timeZone: String!
  }

  input UpdateCronInput {
    id: ID!
    uri: String
    httpMethod: String
    body: String
    schedule: String
    timeZone: String
    isActive: Boolean
  }

  type Query {
    cronJobs: [CronJob!]!
    cronJob(id: ID!): CronJob
    health: String!
    serviceStatus: ServiceStatus!
  }

  type Mutation {
    createCronJob(input: CreateCronInput!): CronJob!
    updateCronJob(input: UpdateCronInput!): CronJob
    deleteCronJob(id: ID!): Boolean!
  }
`;