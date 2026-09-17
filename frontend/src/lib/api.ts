import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response interceptor: handle 401 with transparent token refresh & queueing
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;

        // Skip auth endpoints to avoid loops
        const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
            originalRequest?.url?.includes('/auth/register') ||
            originalRequest?.url?.includes('/auth/refresh') ||
            originalRequest?.url?.includes('/auth/logout');

        if (status === 401 && !originalRequest?._retry && !isAuthEndpoint && typeof window !== 'undefined') {
            const hadSession = !!localStorage.getItem('token') || !!localStorage.getItem('refreshToken');
            const refreshToken = localStorage.getItem('refreshToken');

            // If user never had a session (e.g. guest request), do not redirect or clear
            if (!hadSession) {
                return Promise.reject(error);
            }

            // If user had a session but no refresh token is available, clear session safely
            if (!refreshToken) {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                delete api.defaults.headers.common.Authorization;
                window.dispatchEvent(new Event('auth-session-expired'));

                const pathname = window.location.pathname;
                const authPages = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-otp', '/verify-2fa'];
                if (!authPages.some(page => pathname.startsWith(page))) {
                    const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
                    window.location.href = `/login?redirect=${currentUrl}`;
                }
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
                const newAccessToken = res.data.tokens?.accessToken || res.data.accessToken || res.data.token;
                const newRefreshToken = res.data.tokens?.refreshToken || res.data.refreshToken;

                if (newAccessToken) {
                    localStorage.setItem('token', newAccessToken);
                    if (newRefreshToken) {
                        localStorage.setItem('refreshToken', newRefreshToken);
                    }
                    api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                    processQueue(null, newAccessToken);
                    return api(originalRequest);
                }
                throw new Error('Refresh response missing token');
            } catch (refreshErr) {
                processQueue(refreshErr, null);
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                delete api.defaults.headers.common.Authorization;
                window.dispatchEvent(new Event('auth-session-expired'));

                const pathname = window.location.pathname;
                const authPages = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-otp', '/verify-2fa'];
                if (!authPages.some(page => pathname.startsWith(page))) {
                    const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
                    window.location.href = `/login?redirect=${currentUrl}`;
                }
                return Promise.reject(refreshErr);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
