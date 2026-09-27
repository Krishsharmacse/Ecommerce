import api from './api';

export interface User {
    id: string;
    firstname: string;
    lastname?: string;
    email: string;
    role: 'customer' | 'vendor' | 'admin' | 'user' | 'shopkeeper' | 'manager' | 'owner';
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
    requires2FA?: boolean;
    tempToken?: string;
    useGoogle?: boolean;
    verification?: { otpId: string };
}

export function normalizeUser(raw: unknown): User | null {
    if (!raw || typeof raw !== 'object') return null;
    const u = raw as Record<string, unknown>;
    const rawRole = String(u.role || '').toUpperCase();
    let mappedRole: 'user' | 'shopkeeper' | 'manager' | 'owner' | 'admin' = 'user';
    if (rawRole === 'ADMIN' || rawRole === 'OWNER') mappedRole = 'owner';
    else if (rawRole === 'VENDOR' || rawRole === 'MANAGER') mappedRole = 'manager';
    else if (rawRole === 'SHOPKEEPER') mappedRole = 'shopkeeper';
    else if (rawRole === 'CUSTOMER' || rawRole === 'USER') mappedRole = 'user';
    else {
        const lower = String(u.role || '').toLowerCase();
        if (['user', 'shopkeeper', 'manager', 'owner', 'admin'].includes(lower)) {
            mappedRole = lower as 'user' | 'shopkeeper' | 'manager' | 'owner' | 'admin';
        }
    }

    return {
        id: String(u.id || u._id || ''),
        firstname: String(u.firstName || u.firstname || ''),
        lastname: String(u.lastName || u.lastname || ''),
        email: String(u.email || ''),
        role: mappedRole,
        isverified: Boolean(u.isEmailVerified ?? u.isverified ?? false),
        shopId: (u.shopId as User['shopId']) || null,
        isManagerApproved: Boolean(u.isManagerApproved),
        isShopkeeperApproved: Boolean(u.isShopkeeperApproved),
        twoFactorEnabled: Boolean(u.twoFactorEnabled),
        profilePIC: u.profilePIC ? String(u.profilePIC) : undefined,
        hasPassword: u.hasPassword !== false,
        linkedGoogle: Boolean(u.linkedGoogle),
    };
}

export const authService = {
    register: async (data: {
        firstname: string; lastname: string; email: string; password: string; role?: string;
    }): Promise<AuthResponse> => {
        const res = await api.post('/auth/register', data);
        const token = res.data.accessToken || res.data.token || res.data.tokens?.accessToken;
        const normalized = res.data.user ? normalizeUser(res.data.user) : undefined;
        if (token) {
            localStorage.setItem('token', token);
            api.defaults.headers.common.Authorization = `Bearer ${token}`;
            const refreshTok = res.data.tokens?.refreshToken || res.data.refreshToken;
            if (refreshTok) localStorage.setItem('refreshToken', refreshTok);
            if (normalized) localStorage.setItem('user', JSON.stringify(normalized));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('storage'));
            }
        }
        return {
            ...res.data,
            user: normalized || res.data.user,
            verification: res.data.verification,
        };
    },

    login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
        const res = await api.post('/auth/login', data);
        const token = res.data.accessToken || res.data.token || res.data.tokens?.accessToken;
        const normalized = res.data.user ? normalizeUser(res.data.user) : undefined;
        if (token) {
            localStorage.setItem('token', token);
            api.defaults.headers.common.Authorization = `Bearer ${token}`;
            const refreshTok = res.data.tokens?.refreshToken || res.data.refreshToken;
            if (refreshTok) localStorage.setItem('refreshToken', refreshTok);
            if (normalized) localStorage.setItem('user', JSON.stringify(normalized));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('storage'));
            }
        }
        return {
            ...res.data,
            user: normalized || res.data.user,
        };
    },

    verifyOTP: async (data: { email: string; otp: string; otpId?: string; code?: string }): Promise<AuthResponse> => {
        const res = await api.post('/auth/verify-email', {
            otpId: data.otpId || '',
            code: data.code || data.otp,
        });
        return res.data;
    },

    resendOTP: async (email: string): Promise<AuthResponse> => {
        const res = await api.post('/auth/resend-verification', { email });
        return res.data;
    },

    forgotPassword: async (email: string): Promise<AuthResponse> => {
        const res = await api.post('/auth/forgot-password', { email });
        return res.data;
    },

    resetPassword: async (data: { token: string; newPassword: string; confirmPassword: string }): Promise<AuthResponse> => {
        const res = await api.post('/auth/reset-password', data);
        return res.data;
    },

    exchangeOAuthTicket: async (ticket: string): Promise<AuthResponse> => {
        const res = await api.post('/auth/oauth/exchange', { ticket });
        const token = res.data.accessToken || res.data.token;
        const normalized = res.data.user ? normalizeUser(res.data.user) : undefined;
        if (token) {
            localStorage.setItem('token', token);
            api.defaults.headers.common.Authorization = `Bearer ${token}`;
            const refreshTok = res.data.tokens?.refreshToken || res.data.refreshToken;
            if (refreshTok) localStorage.setItem('refreshToken', refreshTok);
            if (normalized) localStorage.setItem('user', JSON.stringify(normalized));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('storage'));
            }
        }
        return {
            ...res.data,
            user: normalized || res.data.user,
        };
    },

    getProfile: async (): Promise<User | null> => {
        const res = await api.get('/users/me');
        const user = res.data.user;
        if (user) {
            const normalized = normalizeUser(user);
            if (normalized) {
                localStorage.setItem('user', JSON.stringify(normalized));
                return normalized;
            }
        }
        return null;
    },

    logout: async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            try {
                await api.post('/auth/logout', { refreshToken });
            } catch {
                // Silently ignore if network drops or session already revoked
            }
        }
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        delete api.defaults.headers.common.Authorization;
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('auth-session-expired'));
        }
    },

    getUser: (): User | null => {
        if (typeof window === 'undefined') return null;
        try {
            const u = localStorage.getItem('user');
            return u ? normalizeUser(JSON.parse(u)) : null;
        } catch {
            return null;
        }
    },

    getToken: (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('token');
    },

    isLoggedIn: () => !!authService.getToken(),
    isAdmin: () => ['admin', 'owner'].includes((authService.getUser()?.role || '').toLowerCase()),
    isVendor: () => ['vendor', 'manager', 'admin', 'owner'].includes((authService.getUser()?.role || '').toLowerCase()),
    isCustomer: () => ['customer', 'user'].includes((authService.getUser()?.role || '').toLowerCase()),
    isOwner: () => ['admin', 'owner'].includes((authService.getUser()?.role || '').toLowerCase()),
    isManager: () => ['vendor', 'manager', 'admin', 'owner'].includes((authService.getUser()?.role || '').toLowerCase()),
    isApprovedManager: () => {
        const u = authService.getUser();
        const r = (u?.role || '').toLowerCase();
        return r === 'admin' || r === 'owner' || r === 'vendor' || (r === 'manager' && !!u?.isManagerApproved);
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
        const token = res.data.accessToken || res.data.token || res.data.tokens?.accessToken;
        const normalized = res.data.user ? normalizeUser(res.data.user) : undefined;
        if (token) {
            localStorage.setItem('token', token);
            api.defaults.headers.common.Authorization = `Bearer ${token}`;
            const refreshTok = res.data.tokens?.refreshToken || res.data.refreshToken;
            if (refreshTok) localStorage.setItem('refreshToken', refreshTok);
            if (normalized) localStorage.setItem('user', JSON.stringify(normalized));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('storage'));
            }
        }
        return {
            ...res.data,
            user: normalized || res.data.user,
        };
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
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
        const url = `${apiUrl}/auth/google?origin=${encodeURIComponent(origin)}`;
        window.location.href = url;
    },
};
