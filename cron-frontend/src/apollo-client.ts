import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';


// http link setup
const httpLink = createHttpLink({
    uri: import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql',
    credentials: 'same-origin',
});

// error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
        graphQLErrors.forEach(({ message, locations, path }) => {
            console.error(
                `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
            );

            if (message.includes('not found')) {
                console.warn('Resource not found - this might be expected behavior');
            }
        });
    }

    if (networkError) {
        console.error(`[Network error]: ${networkError}`);

        // Handle network errors
        if (networkError.message.includes('Failed to fetch')) {
            console.error('Backend server is not responding. Please check if the server is running.');
        }
    }
});

// apollo client instance
const client = new ApolloClient({
    link: from([errorLink, httpLink]),
    cache: new InMemoryCache({
        typePolicies: {
            Query: {
                fields: {
                    cronJobs: {
                        merge(_, incoming) {
                            return incoming;
                        },
                    },
                },
            },
            CronJob: {
                fields: {
                    lastRun: {
                        merge(_, incoming) {
                            return incoming;
                        },
                    },
                    nextRun: {
                        merge(_, incoming) {
                            return incoming;
                        },
                    },
                },
            },
        },
    }),
    defaultOptions: {
        watchQuery: {
            errorPolicy: 'all',
            fetchPolicy: 'cache-and-network',
        },
        query: {
            errorPolicy: 'all',
            fetchPolicy: 'cache-first',
        },
        mutate: {
            errorPolicy: 'all',
        },
    },
});

export default client;