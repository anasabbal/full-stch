import React, { useState } from 'react';
import { ApolloProvider, useQuery } from '@apollo/client';
import client from './apollo-client';
import Layout from './components/Layout';
import CronForm from './components/CronForm';
import CronList from './components/CronList';
import { HEALTH_CHECK, SERVICE_STATUS } from './graphql/queries';
import { AlertTriangle, Loader2, Wifi, WifiOff } from 'lucide-react';

const HealthStatus: React.FC = () => {
    const { loading, error } = useQuery(HEALTH_CHECK, {
        pollInterval: 60000,
        errorPolicy: 'ignore',
    });

    if (loading) {
        return (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking server...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center space-x-2 text-sm text-red-600">
                <WifiOff className="h-4 w-4" />
                <span>Server offline</span>
            </div>
        );
    }

    return (
        <div className="flex items-center space-x-2 text-sm text-green-600">
            <Wifi className="h-4 w-4" />
            <span>Connected</span>
        </div>
    );
};

const ServiceStatusCard: React.FC = () => {
    const { data, loading, error } = useQuery(SERVICE_STATUS, {
        pollInterval: 30000,
        errorPolicy: 'ignore',
    });

    return (
        <div className="card p-6 mb-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
                    <p className="text-sm text-gray-600">Monitor your CRON management service</p>
                </div>

                <div className="flex items-center space-x-6">
                    <HealthStatus />

                    {data?.serviceStatus && (
                        <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${
                                    data.serviceStatus.isInitialized ? 'bg-green-500' : 'bg-yellow-500'
                                }`} />
                                <span className="text-gray-600">
                  {data.serviceStatus.isInitialized ? 'Initialized' : 'Starting'}
                </span>
                            </div>

                            <div className="text-gray-400">•</div>

                            <div className="text-gray-600">
                                {data.serviceStatus.totalJobs} jobs
                            </div>

                            {data.serviceStatus.clusterMode && (
                                <>
                                    <div className="text-gray-400">•</div>
                                    <span className="text-blue-600 text-xs font-medium bg-blue-100 px-2 py-1 rounded">
                    Cluster Mode
                  </span>
                                </>
                            )}
                        </div>
                    )}

                    {loading && (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}

                    {error && (
                        <div title="Status unavailable">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MainContent: React.FC = () => {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleSuccess = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <Layout>
            {/* Status Bar */}
            <ServiceStatusCard />

            {/* Main Grid */}
            <div className="grid gap-8 lg:grid-cols-2">
                {/* Left Column - Form */}
                <div className="space-y-6">
                    <CronForm onSuccess={handleSuccess} />

                    {/* Quick Tips */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <span className="text-blue-500 mr-2">💡</span>
                            Quick Tips
                        </h3>
                        <div className="space-y-4 text-sm text-gray-600">
                            <div className="flex items-start space-x-3">
                                <span className="text-blue-500 font-bold mt-0.5">•</span>
                                <div>
                                    <strong className="text-gray-700">CRON Expressions:</strong> Use standard 5-field format (minute hour day month weekday).
                                    <code className="bg-gray-100 px-1 py-0.5 rounded text-xs ml-1">*/5 * * * *</code> runs every 5 minutes.
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <span className="text-green-500 font-bold mt-0.5">•</span>
                                <div>
                                    <strong className="text-gray-700">Webhook URLs:</strong> Ensure your endpoint accepts the configured HTTP method and handles the request body properly.
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <span className="text-purple-500 font-bold mt-0.5">•</span>
                                <div>
                                    <strong className="text-gray-700">Timezones:</strong> Jobs execute in the specified timezone, not server time. Use timezone abbreviations or full names.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Example URLs */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <span className="text-green-500 mr-2">🔗</span>
                            Example Test URLs
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <strong className="text-gray-700">Local notification service:</strong>
                                <code className="block bg-gray-100 p-2 rounded mt-1 text-xs">
                                    http://localhost:3001/webhook
                                </code>
                            </div>
                            <div>
                                <strong className="text-gray-700">Production notification service:</strong>
                                <code className="block bg-gray-100 p-2 rounded mt-1 text-xs">
                                    http://notification:3001/webhook
                                </code>
                            </div>
                            <div>
                                <strong className="text-gray-700">Local logs service:</strong>
                                <code className="block bg-gray-100 p-2 rounded mt-1 text-xs">
                                    http://localhost:3001/logs
                                </code>
                            </div>
                            <div>
                                <strong className="text-gray-700">Production logs service:</strong>
                                <code className="block bg-gray-100 p-2 rounded mt-1 text-xs">
                                    http://notification:3001/logs
                                </code>
                            </div>
                            <div>
                                <strong className="text-gray-700">Production notification service (NestJs):</strong>
                                <code className="block bg-gray-100 p-2 rounded mt-1 text-xs">
                                    http://notification-nestjs:3001/webhook
                                </code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - List */}
                <div>
                    <CronList key={refreshKey} />
                </div>
            </div>
        </Layout>
    );
};

const App: React.FC = () => {
    return (
        <ApolloProvider client={client}>
            <MainContent />
        </ApolloProvider>
    );
};

export default App;