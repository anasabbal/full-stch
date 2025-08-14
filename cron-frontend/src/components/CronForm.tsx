import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@apollo/client';
import { CREATE_CRON_JOB, UPDATE_CRON_JOB } from '../graphql/mutations';
import { GET_CRON_JOBS } from '../graphql/queries';
import { AlertCircle, Save, X, Info, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { CreateCronInput, CronJob } from '../types';

interface CronFormData extends CreateCronInput {}

interface CronFormProps {
    initialData?: CronJob;
    onSuccess?: () => void;
    onCancel?: () => void;
    isEditing?: boolean;
}

const timeZones = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Europe/Lisbon', label: 'Lisbon' },
    { value: 'Europe/Rome', label: 'Rome' },
    { value: 'Europe/Madrid', label: 'Madrid' },
];

const commonSchedules = [
    { value: '* * * * *', label: 'Every minute', description: 'Runs every minute' },
    { value: '*/5 * * * *', label: 'Every 5 minutes', description: 'Runs every 5 minutes' },
    { value: '*/15 * * * *', label: 'Every 15 minutes', description: 'Runs every 15 minutes' },
    { value: '*/30 * * * *', label: 'Every 30 minutes', description: 'Runs every 30 minutes' },
    { value: '0 * * * *', label: 'Every hour', description: 'Runs at the top of every hour' },
    { value: '0 */6 * * *', label: 'Every 6 hours', description: 'Runs every 6 hours' },
    { value: '0 0 * * *', label: 'Daily at midnight', description: 'Runs once per day at 00:00' },
    { value: '0 9 * * *', label: 'Daily at 9 AM', description: 'Runs once per day at 09:00' },
    { value: '0 0 * * 0', label: 'Weekly (Sunday)', description: 'Runs every Sunday at midnight' },
    { value: '0 0 1 * *', label: 'Monthly (1st day)', description: 'Runs on the 1st day of each month' },
];

const CronForm: React.FC<CronFormProps> = ({
                                               initialData,
                                               onSuccess,
                                               onCancel,
                                               isEditing = false
                                           }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showBodyField, setShowBodyField] = useState(
        Boolean(initialData?.body) || (initialData?.httpMethod !== 'GET')
    );

    // Create proper default values
    const getDefaultValues = (): CronFormData => {
        if (initialData) {
            return {
                uri: initialData.uri,
                httpMethod: initialData.httpMethod,
                body: initialData.body || '',
                schedule: initialData.schedule,
                timeZone: initialData.timeZone,
            };
        }
        return {
            uri: '',
            httpMethod: 'POST',
            body: '',
            schedule: '*/5 * * * *',
            timeZone: 'UTC',
        };
    };

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors }
    } = useForm<CronFormData>({
        defaultValues: getDefaultValues()
    });

    const watchedMethod = watch('httpMethod');
    const watchedSchedule = watch('schedule');

    // Reset form when initialData changes (for editing mode)
    useEffect(() => {
        if (initialData && isEditing) {
            console.log('Resetting form with initialData:', initialData);
            reset({
                uri: initialData.uri,
                httpMethod: initialData.httpMethod,
                body: initialData.body || '',
                schedule: initialData.schedule,
                timeZone: initialData.timeZone,
            });

            // set body field visibility based on method
            setShowBodyField(Boolean(initialData.body) || initialData.httpMethod !== 'GET');
        }
    }, [initialData, isEditing, reset]);

    useEffect(() => {
        if (watchedMethod === 'GET') {
            setShowBodyField(false);
            setValue('body', '');
        } else {
            setShowBodyField(true);
        }
    }, [watchedMethod, setValue]);

    const [createCronJob] = useMutation(CREATE_CRON_JOB, {
        refetchQueries: [{ query: GET_CRON_JOBS }],
    });

    const [updateCronJob] = useMutation(UPDATE_CRON_JOB, {
        refetchQueries: [{ query: GET_CRON_JOBS }],
    });

    const onSubmit = async (data: CronFormData) => {
        console.log('Form submitted with data:', data);
        console.log('Is editing:', isEditing);
        console.log('Initial data:', initialData);

        setIsSubmitting(true);
        try {
            if (isEditing && initialData) {
                console.log('Updating cron job with ID:', initialData.id);
                const result = await updateCronJob({
                    variables: {
                        input: {
                            id: initialData.id,
                            uri: data.uri,
                            httpMethod: data.httpMethod,
                            body: data.body || null,
                            schedule: data.schedule,
                            timeZone: data.timeZone,
                        }
                    }
                });
                console.log('Update result:', result);
            } else {
                console.log('Creating new cron job');
                const result = await createCronJob({
                    variables: {
                        input: {
                            uri: data.uri,
                            httpMethod: data.httpMethod,
                            body: data.body || null,
                            schedule: data.schedule,
                            timeZone: data.timeZone,
                        }
                    }
                });
                console.log('Create result:', result);
            }

            if (!isEditing) {
                reset();
            }
            onSuccess?.();
        } catch (error: any) {
            console.error('Failed to save cron job:', error);
            console.error('GraphQL errors:', error.graphQLErrors);
            console.error('Network error:', error.networkError);
            alert(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const setCommonSchedule = (schedule: string) => {
        setValue('schedule', schedule, { shouldDirty: true });
    };

    const validateCronExpression = (schedule: string) => {
        const parts = schedule.trim().split(/\s+/);
        if (parts.length !== 5) {
            return 'CRON expression must have exactly 5 parts (minute hour day month weekday)';
        }
        return true;
    };

    return (
        <div className="card animate-fade-in">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {isEditing ? 'Edit CRON Job' : 'Create New CRON Job'}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {isEditing ? 'Update your scheduled task configuration' : 'Schedule a new automated task'}
                        </p>
                        {/* Debug info in development */}
                        {process.env.NODE_ENV === 'development' && isEditing && (
                            <p className="text-xs text-blue-600 mt-1">
                                Editing job ID: {initialData?.id}
                            </p>
                        )}
                    </div>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            aria-label="Close"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* URI Field */}
                    <div>
                        <label htmlFor="uri" className="block text-sm font-medium text-gray-700 mb-1">
                            Webhook URI *
                        </label>
                        <input
                            id="uri"
                            {...register('uri', {
                                required: 'URI is required',
                                pattern: {
                                    value: /^https?:\/\/.+/,
                                    message: 'Please enter a valid URL starting with http:// or https://'
                                }
                            })}
                            type="url"
                            className={clsx('input-field', errors.uri && 'border-red-300 focus:border-red-500 focus:ring-red-500')}
                            placeholder="https://api.example.com/webhook"
                        />
                        {errors.uri && (
                            <div className="mt-1 flex items-center text-sm text-red-600">
                                <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                                {errors.uri.message}
                            </div>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                            The URL that will receive the HTTP request when the CRON job executes
                        </p>
                    </div>

                    {/* HTTP Method Field */}
                    <div>
                        <label htmlFor="httpMethod" className="block text-sm font-medium text-gray-700 mb-1">
                            HTTP Method *
                        </label>
                        <select
                            id="httpMethod"
                            {...register('httpMethod')}
                            className="input-field"
                        >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                            The HTTP method used to call your webhook endpoint
                        </p>
                    </div>

                    {/* Body Field */}
                    {showBodyField && (
                        <div>
                            <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
                                Request Body
                            </label>
                            <textarea
                                id="body"
                                {...register('body')}
                                rows={3}
                                className="input-field"
                                placeholder="Optional message or data to send with the request"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Optional JSON data or text that will be sent in the request body
                            </p>
                        </div>
                    )}

                    {/* Schedule Field */}
                    <div>
                        <label htmlFor="schedule" className="block text-sm font-medium text-gray-700 mb-1">
                            Schedule (CRON Expression) *
                        </label>
                        <input
                            id="schedule"
                            {...register('schedule', {
                                required: 'Schedule is required',
                                validate: validateCronExpression
                            })}
                            type="text"
                            className={clsx('input-field', errors.schedule && 'border-red-300 focus:border-red-500 focus:ring-red-500')}
                            placeholder="*/5 * * * * (every 5 minutes)"
                        />
                        {errors.schedule && (
                            <div className="mt-1 flex items-center text-sm text-red-600">
                                <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                                {errors.schedule.message}
                            </div>
                        )}

                        {/* Common Schedules */}
                        <div className="mt-3">
                            <p className="text-sm text-gray-600 mb-2 flex items-center">
                                <Info className="h-4 w-4 mr-1" />
                                Common schedules:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {commonSchedules.map((item) => (
                                    <button
                                        key={item.value}
                                        type="button"
                                        onClick={() => setCommonSchedule(item.value)}
                                        className={clsx(
                                            'text-left text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded border transition-colors',
                                            watchedSchedule === item.value && 'bg-primary-50 border-primary-200 text-primary-800'
                                        )}
                                        title={item.description}
                                    >
                                        <div className="font-medium">{item.label}</div>
                                        <div className="text-gray-500 font-mono">{item.value}</div>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 flex items-center text-xs text-gray-500">
                                <span>Need help? Visit</span>
                                <a
                                    href="https://crontab.guru/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-1 text-primary-600 hover:text-primary-800 inline-flex items-center"
                                >
                                    crontab.guru
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                                <span className="ml-1">for interactive CRON expression builder</span>
                            </div>
                        </div>
                    </div>

                    {/* Time Zone Field */}
                    <div>
                        <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700 mb-1">
                            Time Zone *
                        </label>
                        <select
                            id="timeZone"
                            {...register('timeZone')}
                            className="input-field"
                        >
                            {timeZones.map((tz) => (
                                <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                            The timezone in which the CRON schedule will be evaluated
                        </p>
                    </div>

                    {/* Submit Button */}
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={clsx(
                                'flex-1 flex items-center justify-center space-x-2 btn-primary',
                                isSubmitting && 'opacity-50 cursor-not-allowed'
                            )}
                        >
                            <Save className="h-4 w-4" />
                            <span>
                                {isSubmitting
                                    ? (isEditing ? 'Updating...' : 'Creating...')
                                    : (isEditing ? 'Update CRON Job' : 'Create CRON Job')
                                }
                            </span>
                        </button>

                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={isSubmitting}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                        )}
                    </div>

                    {/* Help Text */}
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">CRON Format Guide</h4>
                        <div className="text-xs text-blue-800 space-y-1">
                            <div className="font-mono">* * * * *</div>
                            <div className="grid grid-cols-5 gap-2 text-center">
                                <span>Minute<br/>(0-59)</span>
                                <span>Hour<br/>(0-23)</span>
                                <span>Day<br/>(1-31)</span>
                                <span>Month<br/>(1-12)</span>
                                <span>Weekday<br/>(0-6)</span>
                            </div>
                            <div className="mt-2 space-y-1">
                                <div><code>*</code> = any value</div>
                                <div><code>,</code> = value list separator</div>
                                <div><code>-</code> = range of values</div>
                                <div><code>/</code> = step values</div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CronForm;