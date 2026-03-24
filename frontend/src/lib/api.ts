import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 120000, // 120 second timeout for LLM/Render cold starts
});

// Request interceptor to add User ID
api.interceptors.request.use((config) => {
    try {
        // Access localStorage directly since this runs in the browser
        const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('transactai_auth_session') : null;
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            const userId = session.phone?.replace(/\+/g, '').trim();
            if (userId) {
                // console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url} | Header X-User-Id: ${userId}`);
                config.headers['X-User-Id'] = userId;
            } else {
                // console.warn(`⚠️ API Request: ${config.method?.toUpperCase()} ${config.url} | No User ID found in session`);
            }
        } else {
            // console.warn(`⚠️ API Request: ${config.method?.toUpperCase()} ${config.url} | No session found`);
        }
    } catch (e) {
        console.error("Failed to inject user id header", e);
    }
    return config;
});

// Request interceptor for retry logic
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as any;
        
        // Retry logic for network errors
        if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
            if (!config._retry) {
                config._retry = true;
                // Wait 1 second before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
                return api(config);
            }
        }
        
        return Promise.reject(error);
    }
);

export const endpoints = {
    classify: '/classify',
    manualCategory: '/manual-category',
    addCategory: '/add-category',
    getTransactions: '/transactions',
    getSummary: '/summary',
    updateTransaction: (id: string) => `/transactions/${id}`,
    getInsightsMonthly: '/insights/monthly',
    getInsightsWeekly: '/insights/weekly',
    getInsightsDaily: '/insights/daily',
};
