import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 60000, // 60 second timeout for LLM processing
});

// Request interceptor to add User ID
api.interceptors.request.use((config) => {
    try {
        // Access localStorage directly since this runs in the browser
        const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('transactai_session') : null;
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            const userId = session.phone?.replace(/\+/g, '');
            if (userId) {
                config.headers['X-User-Id'] = userId;
            }
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
