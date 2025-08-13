import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import CronList from '../../components/CronList';
import { GET_CRON_JOBS } from '../../graphql/queries';

const mockJobsQuery = {
    request: {
        query: GET_CRON_JOBS
    },
    result: {
        data: {
            cronJobs: [
                {
                    id: '1',
                    uri: 'http://localhost:3001/webhook',
                    httpMethod: 'POST',
                    body: 'Test message',
                    schedule: '*/5 * * * *',
                    timeZone: 'UTC',
                    isActive: true,
                    createdAt: '2024-01-01T10:00:00Z',
                    updatedAt: '2024-01-01T10:00:00Z',
                    lastRun: '2024-01-01T10:05:00Z',
                    nextRun: '2024-01-01T10:10:00Z'
                }
            ]
        }
    }
};

const emptyJobsQuery = {
    request: {
        query: GET_CRON_JOBS
    },
    result: {
        data: {
            cronJobs: []
        }
    }
};

describe('CronList', () => {
    it('displays loading state', () => {
        render(
            <MockedProvider mocks={[]}>
                <CronList />
            </MockedProvider>
        );

        expect(screen.getByText(/loading cron jobs/i)).toBeInTheDocument();
    });

    it('displays CRON jobs when loaded', async () => {
        render(
            <MockedProvider mocks={[mockJobsQuery]} addTypename={false}>
                <CronList />
            </MockedProvider>
        );

        await screen.findByText('http://localhost:3001/webhook');
        expect(screen.getByText('POST')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('*/5 * * * *')).toBeInTheDocument();
    });

    it('displays empty state when no jobs', async () => {
        render(
            <MockedProvider mocks={[emptyJobsQuery]} addTypename={false}>
                <CronList />
            </MockedProvider>
        );

        await screen.findByText(/no cron jobs found/i);
        expect(screen.getByText(/get started by creating/i)).toBeInTheDocument();
    });
});