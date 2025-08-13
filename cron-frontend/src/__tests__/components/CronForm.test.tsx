import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { vi } from 'vitest';
import CronForm from '../../components/CronForm';
import { CREATE_CRON_JOB } from '../../graphql/mutations';

const mockCreateMutation = {
    request: {
        query: CREATE_CRON_JOB,
        variables: {
            input: {
                uri: 'http://localhost:3001/webhook',
                httpMethod: 'POST',
                schedule: '*/5 * * * *',
                timeZone: 'UTC',
                body: 'Test message'
            }
        }
    },
    result: {
        data: {
            createCronJob: {
                id: 'test-id',
                uri: 'http://localhost:3001/webhook',
                httpMethod: 'POST',
                schedule: '*/5 * * * *',
                timeZone: 'UTC',
                body: 'Test message',
                isActive: true,
                createdAt: '2024-01-01',
                updatedAt: '2024-01-01',
                lastRun: null,
                nextRun: '2024-01-01'
            }
        }
    }
};

describe('CronForm', () => {
    it('renders form fields', () => {
        render(
            <MockedProvider mocks={[]}>
                <CronForm />
            </MockedProvider>
        );

        expect(screen.getByLabelText(/webhook uri/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/http method/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/schedule/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/time zone/i)).toBeInTheDocument();
    });

    it('submits form with valid data', async () => {
        const onSuccess = vi.fn(); // Use vi.fn() instead of jest.fn()

        render(
            <MockedProvider mocks={[mockCreateMutation]} addTypename={false}>
                <CronForm onSuccess={onSuccess} />
            </MockedProvider>
        );

        // Fill out form
        fireEvent.change(screen.getByLabelText(/webhook uri/i), {
            target: { value: 'http://localhost:3001/webhook' }
        });

        fireEvent.change(screen.getByLabelText(/request body/i), {
            target: { value: 'Test message' }
        });

        // Submit form
        fireEvent.click(screen.getByText(/create cron job/i));

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalled();
        }, { timeout: 3000 });
    });

    it('shows validation errors for empty URI', async () => {
        render(
            <MockedProvider mocks={[]}>
                <CronForm />
            </MockedProvider>
        );

        // Submit form without filling URI
        fireEvent.click(screen.getByText(/create cron job/i));

        await waitFor(() => {
            expect(screen.getByText(/uri is required/i)).toBeInTheDocument();
        });
    });
});