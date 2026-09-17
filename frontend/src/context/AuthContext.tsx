'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, authService } from '@/lib/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface LoginResult {
    success: boolean;
    message: string;
    needsVerification?: boolean;
    requires2FA?: boolean;
    tempToken?: string;
    useGoogle?: boolean;
    user?: User;
}

export interface AuthContextType {
    user: User | null;
    authStatus: AuthStatus;
    isLoading: boolean;
    isLoggedIn: boolean;
    isAdmin: boolean;
    isVendor: boolean;
    isCustomer: boolean;
    isOwner: boolean;            // backwards compatibility
    isManager: boolean;          // backwards compatibility
    isApprovedManager: boolean;  // backwards compatibility
    isShopkeeper: boolean;       // backwards compatibility
    isApprovedShopkeeper: boolean;// backwards compatibility
    login: (email: string, password: string) => Promise<LoginResult>;
    register: (data: { firstname: string; lastname: string; email: string; password: string; role?: string }) => Promise<{ success: boolean; message: string; user?: User }>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

    const refreshUser = async () => {
        try {
            if (authService.getToken()) {
                const u = await authService.getProfile();
                if (u) {
                    setUser(u);
                    setAuthStatus('authenticated');
                    return;
                }
            }
            const localU = authService.getUser();
            if (localU) {
                setUser(localU);
                setAuthStatus('authenticated');
            } else {
                setUser(null);
                setAuthStatus('unauthenticated');
            }
        } catch {
            const localU = authService.getUser();
            if (localU) {
                setUser(localU);
                setAuthStatus('authenticated');
            } else {
                setUser(null);
                setAuthStatus('unauthenticated');
            }
        }
    };

    useEffect(() => {
        let isMounted = true;

        const syncAuth = async () => {
            const token = authService.getToken();
            const cachedUser = authService.getUser();

            if (!token) {
                if (isMounted) {
                    setUser(null);
                    setAuthStatus('unauthenticated');
                }
                return;
            }

            // Immediately hydrate from valid cached user to avoid unauthenticated flash
            if (cachedUser && isMounted) {
                setUser(cachedUser);
                setAuthStatus('authenticated');
            }

            try {
                const profile = await authService.getProfile();
                if (isMounted) {
                    if (profile) {
                        setUser(profile);
                        setAuthStatus('authenticated');
                    } else if (cachedUser) {
                        setUser(cachedUser);
                        setAuthStatus('authenticated');
                    } else {
                        setUser(null);
                        setAuthStatus('unauthenticated');
                    }
                }
            } catch {
                if (isMounted) {
                    if (cachedUser) {
                        setUser(cachedUser);
                        setAuthStatus('authenticated');
                    } else {
                        setUser(null);
                        setAuthStatus('unauthenticated');
                    }
                }
            }
        };

        // Run async in microtask to avoid setState-in-effect warning
        void syncAuth();

        // Multi-tab synchronization
        const handleStorage = () => {
            void syncAuth();
        };
        const handleExpired = () => {
            if (isMounted) {
                setUser(null);
                setAuthStatus('unauthenticated');
            }
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener('auth-session-expired', handleExpired);

        return () => {
            isMounted = false;
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('auth-session-expired', handleExpired);
        };
    }, []);

    const login = async (email: string, password: string): Promise<LoginResult> => {
        try {
            const res = await authService.login({ email, password });

            // 2FA required — don't set user yet, return tempToken for verify-2fa page
            if (res.requires2FA) {
                return {
                    success: true,
                    requires2FA: true,
                    message: res.message || 'Two-factor authentication required',
                    tempToken: res.tempToken,
                };
            }

            // OAuth-only account (no password)
            if (res.useGoogle) {
                return { success: false, message: res.message || 'Please use Google Sign-In', useGoogle: true };
            }

            if (res.success && res.user) {
                setUser(res.user);
                setAuthStatus('authenticated');
                return {
                    success: true,
                    message: res.message || 'Welcome back',
                    needsVerification: !res.user.isverified,
                    user: res.user,
                };
            }
            return { success: false, message: res.message || 'Login failed' };
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string; useGoogle?: boolean; requires2FA?: boolean } } };
            const data = e?.response?.data;
            return {
                success: false,
                message: data?.message || 'Invalid email or password',
                useGoogle: data?.useGoogle,
            };
        }
    };

    const register = async (data: { firstname: string; lastname: string; email: string; password: string; role?: string }) => {
        try {
            const res = await authService.register(data);
            if (res.success && res.user) {
                setUser(res.user);
                setAuthStatus('authenticated');
            }
            return { success: res.success, message: res.message || 'Registration successful', user: res.user };
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            return { success: false, message: e?.response?.data?.message || 'Registration failed' };
        }
    };

    const logout = () => {
        setUser(null);
        setAuthStatus('unauthenticated');
        void authService.logout();
    };

    const role = (user?.role || '').toLowerCase();
    const isAdminRole = role === 'admin' || role === 'owner';
    const isVendorRole = role === 'vendor' || role === 'manager' || isAdminRole;
    const isCustomerRole = role === 'customer' || role === 'user';
    const isApprovedManagerRole = isAdminRole || isVendorRole || (role === 'manager' && !!user?.isManagerApproved);

    const isLoading = authStatus === 'loading';
    const isLoggedIn = authStatus === 'authenticated' && !!user;

    return (
        <AuthContext.Provider value={{
            user,
            authStatus,
            isLoading,
            isLoggedIn,
            isAdmin: isAdminRole,
            isVendor: isVendorRole,
            isCustomer: isCustomerRole,
            isOwner: isAdminRole,
            isManager: isVendorRole,
            isApprovedManager: isApprovedManagerRole,
            isShopkeeper: isVendorRole || role === 'shopkeeper',
            isApprovedShopkeeper: isVendorRole || (role === 'shopkeeper' && !!user?.isShopkeeperApproved),
            login, register, logout, refreshUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
