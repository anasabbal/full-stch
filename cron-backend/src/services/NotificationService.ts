import axios from 'axios';

export class NotificationService {
    /**
     * send a notification to the given uri using the specified http method and optional body
     * this method logs both success and failure cases without throwing errors by default
     */
    async notify(uri: string, method: string, body?: string): Promise<void> {
        // generate a timestamp in 'yyyy-mm-dd hh:mm:ss' format
        const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

        // build the payload message (either provided body or a default cron message)
        const payload = body ? `${timestamp} - ${body}` : `${timestamp} - cron triggered`;

        // prepare axios request configuration
        const requestConfig = {
            method: method.toLowerCase() as 'get' | 'post' | 'put' | 'delete',
            url: uri,
            timeout: 10000,
            headers: {
                'content-type': 'application/json',
                'user-agent': 'cron-service/1.0.0',
            },
            // only include body for non-get requests
            ...(method !== 'GET' && {
                data: {
                    message: payload,
                    timestamp: new Date().toISOString(),
                    cronJob: true
                }
            }),
        };

        try {
            // log sending attempt
            console.log(`🔄 sending ${method} request to ${uri}...`);

            // send the request
            const response = await axios(requestConfig);

            // log success details
            console.log(`✅ notification sent to ${uri}: ${payload} (status: ${response.status})`);

            // log any returned data
            if (response.data) {
                console.log(`📥 response:`, response.data);
            }

        } catch (error: any) {
            // handle and log different error cases
            if (error.code === 'ECONNREFUSED') {
                console.error(`❌ connection refused to ${uri} - service may not be running`);
            } else if (error.code === 'ETIMEDOUT') {
                console.error(`❌ timeout connecting to ${uri}`);
            } else if (error.response) {
                // server responded with an error
                console.error(`❌ http ${error.response.status} from ${uri}: ${error.response.statusText}`);
                if (error.response.data) {
                    console.error(`📥 error response:`, error.response.data);
                }
            } else if (error.request) {
                // request was made but no response received
                console.error(`❌ no response from ${uri} - request details:`, {
                    method: method,
                    url: uri,
                    timeout: requestConfig.timeout
                });
            } else {
                // unexpected setup error
                console.error(`❌ request setup error for ${uri}:`, error.message);
            }
        }
    }
}

export default new NotificationService();
