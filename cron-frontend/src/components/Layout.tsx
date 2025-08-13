import React from 'react';
import { Clock, Activity } from 'lucide-react';
import { useQuery } from '@apollo/client';
import { SERVICE_STATUS } from '../graphql/queries';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { data: statusData } = useQuery(SERVICE_STATUS, {
        pollInterval: 30000,
        errorPolicy: 'ignore',
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4">
                            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-2 rounded-lg shadow-md">
                                <Clock className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">CRON Manager</h1>
                                <p className="text-sm text-gray-500">Schedule and manage your automated tasks</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-6">
                            {/* Service Status Indicator */}
                            {statusData?.serviceStatus && (
                                <div className="flex items-center space-x-2 text-sm">
                                    <div className="flex items-center space-x-1">
                                        <div className={`w-2 h-2 rounded-full ${
                                            statusData.serviceStatus.isInitialized ? 'bg-green-500' : 'bg-yellow-500'
                                        }`} />
                                        <span className="text-gray-600">
                      {statusData.serviceStatus.isInitialized ? 'Online' : 'Starting'}
                    </span>
                                    </div>
                                    <span className="text-gray-400">•</span>
                                    <div className="flex items-center space-x-1">
                                        <Activity className="h-3 w-3 text-gray-400" />
                                        <span className="text-gray-600">
                      {statusData.serviceStatus.totalJobs} jobs
                    </span>
                                    </div>
                                    {statusData.serviceStatus.clusterMode && (
                                        <>
                                            <span className="text-gray-400">•</span>
                                            <span className="text-green-600 text-xs font-medium">Cluster</span>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center space-x-4">
                                <a
                                    href="https://crontab.guru/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-gray-600 hover:text-primary-600 transition-colors font-medium"
                                >
                                    CRON Help
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
};

export default Layout;