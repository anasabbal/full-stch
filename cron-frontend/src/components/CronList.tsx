import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CRON_JOBS } from '../graphql/queries';
import { DELETE_CRON_JOB, UPDATE_CRON_JOB } from '../graphql/mutations';
import {
    Trash2,
    Edit,
    Play,
    Pause,
    ExternalLink,
    Clock,
    Calendar,
    Loader2,
    AlertTriangle,
    Copy,
    CheckCircle,
    MoreVertical
} from 'lucide-react';
import CronForm from './CronForm';
import clsx from 'clsx';
import { CronJob } from '../types';

const CronList: React.FC = () => {
    const { data, loading, error, refetch } = useQuery(GET_CRON_JOBS, {
        pollInterval: 30000, // Refresh every 30 seconds
        errorPolicy: 'all',
    });

    const [editingJob, setEditingJob] = useState<CronJob | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

    const [deleteCronJob] = useMutation(DELETE_CRON_JOB, {
        refetchQueries: [{ query: GET_CRON_JOBS }],
    });

    const [updateCronJob] = useMutation(UPDATE_CRON_JOB, {
        refetchQueries: [{ query: GET_CRON_JOBS }],
    });

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this CRON job? This action cannot be undone.')) {
            return;
        }

        setDeletingId(id);
        try {
            await deleteCronJob({ variables: { id } });
        } catch (error: any) {
            alert(`Failed to delete CRON job: ${error.message}`);
        } finally {
            setDeletingId(null);
        }
    };

    const toggleActive = async (job: CronJob) => {
        try {
            await updateCronJob({
                variables: {
                    input: {
                        id: job.id,
                        isActive: !job.isActive,
                    }
                }
            });
        } catch (error: any) {
            alert(`Failed to ${job.isActive ? 'pause' : 'resume'} CRON job: ${error.message}`);
        }
    };

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    const toggleExpanded = (id: string) => {
        const newExpanded = new Set(expandedJobs);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedJobs(newExpanded);
    };

    // Enhanced date formatting function
    const formatDate = (dateString?: string | null) => {
        // Handle null, undefined, or empty string
        if (!dateString || dateString === 'null' || dateString === 'undefined') {
            return 'Never';
        }

        try {
            // Convert string to Date object
            let date: Date;

            // Handle different date formats
            if (typeof dateString === 'string') {
                // Handle ISO string format
                if (dateString.includes('T') || dateString.includes('Z')) {
                    date = new Date(dateString);
                }
                // Handle timestamp format
                else if (/^\d+$/.test(dateString)) {
                    date = new Date(parseInt(dateString));
                }
                // Handle other string formats
                else {
                    date = new Date(dateString);
                }
            } else {
                date = new Date(dateString);
            }

            // Check if date is valid
            if (isNaN(date.getTime())) {
                console.warn('Invalid date received:', dateString);
                return 'Invalid date';
            }

            // Format the date
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        } catch (error) {
            console.error('Error formatting date:', dateString, error);
            return 'Invalid date';
        }
    };

    // Enhanced relative time function
    const getRelativeTime = (dateString?: string | null) => {
        if (!dateString || dateString === 'null' || dateString === 'undefined') {
            return null;
        }

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return null;

            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            return `${diffDays}d ago`;
        } catch {
            return null;
        }
    };

    // Debug function to log raw data
    const debugJobData = (job: CronJob) => {
        console.log('Raw job data:', {
            id: job.id,
            createdAt: job.createdAt,
            lastRun: job.lastRun,
            nextRun: job.nextRun,
            createdAtType: typeof job.createdAt,
            lastRunType: typeof job.lastRun,
            nextRunType: typeof job.nextRun,
        });
    };

    // Check if we're in development mode using Vite's environment variable
    const isDevelopment = import.meta.env.DEV;

    const getStatusColor = (isActive: boolean) => {
        return isActive ? 'status-active' : 'status-inactive';
    };

    const getMethodColor = (method: string) => {
        const colors = {
            GET: 'method-get',
            POST: 'method-post',
            PUT: 'method-put',
            DELETE: 'method-delete',
        };
        return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="card p-8">
                <div className="flex items-center justify-center space-x-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                    <span className="text-gray-600">Loading CRON jobs...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card p-8">
                <div className="flex items-center justify-center space-x-3 text-red-600">
                    <AlertTriangle className="h-6 w-6" />
                    <div className="text-center">
                        <p className="font-medium">Error loading CRON jobs</p>
                        <p className="text-sm text-red-500 mt-1">{error.message}</p>
                        <button
                            onClick={() => refetch()}
                            className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">CRON Jobs</h2>
                    <p className="text-gray-600 mt-1">
                        {data?.cronJobs?.length || 0} job(s) configured
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="btn-secondary text-sm"
                    disabled={loading}
                >
                    Refresh
                </button>
            </div>

            {/* Edit Modal */}
            {editingJob && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <CronForm
                            initialData={editingJob}
                            isEditing={true}
                            onSuccess={() => setEditingJob(null)}
                            onCancel={() => setEditingJob(null)}
                        />
                    </div>
                </div>
            )}

            {/* Debug Panel (remove in production) */}
            {isDevelopment && data?.cronJobs?.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-xs">
                    <strong>Debug Info (first job):</strong>
                    <pre>{JSON.stringify({
                        createdAt: data.cronJobs[0].createdAt,
                        lastRun: data.cronJobs[0].lastRun,
                        nextRun: data.cronJobs[0].nextRun,
                    }, null, 2)}</pre>
                </div>
            )}

            {/* Jobs Grid */}
            <div className="grid gap-4">
                {data?.cronJobs?.map((job: CronJob) => {
                    const isExpanded = expandedJobs.has(job.id);
                    const relativeLastRun = getRelativeTime(job.lastRun);

                    // Debug log for troubleshooting
                    if (isDevelopment) {
                        debugJobData(job);
                    }

                    return (
                        <div key={job.id} className="card hover:shadow-md transition-all duration-200 animate-slide-up">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="font-semibold text-lg text-gray-900 truncate">
                                                {job.uri}
                                            </h3>
                                            <button
                                                onClick={() => copyToClipboard(job.uri, job.id)}
                                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                                title="Copy URI"
                                            >
                                                {copiedId === job.id ? (
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </button>
                                            <a
                                                href={job.uri}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-400 hover:text-primary-600 transition-colors"
                                                title="Open in new tab"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={clsx('status-badge', getStatusColor(job.isActive))}>
                        {job.isActive ? 'Active' : 'Inactive'}
                      </span>
                                            <span className={clsx('status-badge', getMethodColor(job.httpMethod))}>
                        {job.httpMethod}
                      </span>
                                            <span className="status-badge bg-purple-100 text-purple-800">
                        {job.timeZone}
                      </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                                            <div className="flex items-center space-x-2">
                                                <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                <span><strong>Schedule:</strong> {job.schedule}</span>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                <span><strong>Created:</strong> {formatDate(job.createdAt)}</span>
                                            </div>

                                            {job.lastRun && job.lastRun !== 'null' && (
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-green-500 text-sm">✓</span>
                                                    <span>
                            <strong>Last Run:</strong> {formatDate(job.lastRun)}
                                                        {relativeLastRun && (
                                                            <span className="text-gray-500 ml-1">({relativeLastRun})</span>
                                                        )}
                          </span>
                                                </div>
                                            )}

                                            {job.nextRun && job.nextRun !== 'null' && (
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-blue-500 text-sm">⏰</span>
                                                    <span><strong>Next Run:</strong> {formatDate(job.nextRun)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Expandable content */}
                                        {isExpanded && (
                                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                                {job.body && (
                                                    <div>
                                                        <strong className="text-sm text-gray-700">Request Body:</strong>
                                                        <div className="mt-1 p-3 bg-gray-50 rounded border text-sm font-mono text-gray-800 whitespace-pre-wrap">
                                                            {job.body}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <strong className="text-gray-700">Job ID:</strong>
                                                        <div className="font-mono text-gray-600 text-xs break-all">{job.id}</div>
                                                    </div>
                                                    <div>
                                                        <strong className="text-gray-700">Last Updated:</strong>
                                                        <div className="text-gray-600">{formatDate(job.updatedAt)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center space-x-2 ml-4">
                                        <button
                                            onClick={() => toggleActive(job)}
                                            className={clsx(
                                                'p-2 rounded-md transition-colors',
                                                job.isActive
                                                    ? 'text-orange-600 hover:bg-orange-100'
                                                    : 'text-green-600 hover:bg-green-100'
                                            )}
                                        >
                                            {job.isActive ? <Pause size={18} /> : <Play size={18} />}
                                        </button>

                                        <button
                                            onClick={() => setEditingJob(job)}
                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                        >
                                            <Edit size={18} />
                                        </button>

                                        <button
                                            onClick={() => handleDelete(job.id)}
                                            disabled={deletingId === job.id}
                                            className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
                                        >
                                            {deletingId === job.id ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={18} />
                                            )}
                                        </button>

                                        <button
                                            onClick={() => toggleExpanded(job.id)}
                                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                        >
                                            <MoreVertical size={18} className={clsx(
                                                'transition-transform duration-200',
                                                isExpanded && 'rotate-90'
                                            )} />
                                        </button>
                                    </div>
                                </div>

                                {/* Progress Bar for Active Jobs */}
                                {job.isActive && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                            <span>Job Status</span>
                                            <span className="text-green-600 font-medium">Running</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div className="bg-green-500 h-1.5 rounded-full animate-pulse-slow" style={{ width: '100%' }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Empty State */}
                {(!data?.cronJobs || data.cronJobs.length === 0) && (
                    <div className="card p-12 text-center">
                        <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No CRON jobs found
                        </h3>
                        <p className="text-gray-500 mb-6">
                            Get started by creating your first CRON job
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 max-w-md mx-auto">
                            <div className="flex flex-col items-center">
                                <div className="text-2xl mb-2">🚀</div>
                                <span>Schedule tasks to run automatically</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="text-2xl mb-2">⏰</div>
                                <span>Timezone-aware scheduling</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="text-2xl mb-2">🔄</div>
                                <span>Real-time monitoring</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CronList;