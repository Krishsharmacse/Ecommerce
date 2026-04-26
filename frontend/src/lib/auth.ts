import api from './api';

export interface User {
    id: string;
    firstname: string;
    lastname?: string;
    email: string;
    role: 'user' | 'shopkeeper' | 'manager' | 'owner' | 'admin';
    isverified: boolean;
    shopId?: { _id: string; name: string; status: string; logo?: string; category?: string } | null;
    isManagerApproved?: boolean;
    isShopkeeperApproved?: boolean;
    twoFactorEnabled?: boolean;
    profilePIC?: string;
    hasPassword?: boolean;
    linkedGoogle?: boolean;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    user?: User;
    token?: string;
    accessToken?: string;
}

export const authService = {
    register: async (data: {
        firstname: string; lastname: string; email: string; password: string; role?: string;
    }): Promise<AuthResponse> => {
        const res = await api.post('/user/register', data);
        if (res.data.token) {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
        }
        return res.data;
    },

    login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
        const res = await api.post('/user/login', data);
        if (res.data.token) {
            localStorage.setItem('token', res.data.accessToken || res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
        }
        return res.data;
    },

    verifyOTP: async (data: { email: string; otp: string }): Promise<AuthResponse> => {
        const res = await api.post('/user/verify-otp', data);
        return res.data;
    },

    resendOTP: async (email: string): Promise<AuthResponse> => {
        const res = await api.post('/user/reverify', { email });
        return res.data;
    },

    forgotPassword: async (email: string): Promise<AuthResponse> => {
        const res = await api.post('/user/forgot-password', { email });
        return res.data;
    },

    resetPassword: async (data: { token: string; newPassword: string; confirmPassword: string }): Promise<AuthResponse> => {
        const res = await api.post('/user/reset-password', data);
        return res.data;
    },

    getProfile: async (): Promise<User> => {
        const res = await api.get('/user/profile');
        if (res.data.user) localStorage.setItem('user', JSON.stringify(res.data.user));
        return res.data.user;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getUser: (): User | null => {
        if (typeof window === 'undefined') return null;
        const u = localStorage.getItem('user');
        return u ? JSON.parse(u) : null;
    },

    getToken: (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('token');
    },

    isLoggedIn: () => !!authService.getToken(),
    isOwner: () => authService.getUser()?.role === 'owner',
    isManager: () => ['manager', 'owner'].includes(authService.getUser()?.role || ''),
    isApprovedManager: () => {
        const u = authService.getUser();
        return u?.role === 'owner' || (u?.role === 'manager' && !!u?.isManagerApproved);
    },
};

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 2FA Service
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const twoFactorService = {
    // Get current 2FA status
    getStatus: async () => {
        const res = await api.get('/auth/2fa/status');
        return res.data;
    },

    // Step 1: generate secret and QR code
    setup: async () => {
        const res = await api.post('/auth/2fa/setup');
        return res.data as { success: boolean; qrCode: string; secret: string; message: string };
    },

    // Step 2: confirm with TOTP to activate
    verifySetup: async (token: string) => {
        const res = await api.post('/auth/2fa/verify-setup', { token });
        return res.data as { success: boolean; message: string; backupCodes?: string[] };
    },

    // During login: validate TOTP using tempToken
    validate: async (tempToken: string, totpToken: string) => {
        const res = await api.post('/auth/2fa/validate', { tempToken, totpToken });
        if (res.data.token) {
            localStorage.setItem('token', res.data.accessToken || res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
        }
        return res.data;
    },

    // Disable 2FA (requires TOTP code)
    disable: async (totpToken: string) => {
        const res = await api.delete('/auth/2fa/disable', { data: { totpToken } });
        return res.data;
    },
};

// OAuth helper — redirect to backend Google login
export const oauthService = {
    loginWithGoogle: () => {
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/google`;
    },
};
