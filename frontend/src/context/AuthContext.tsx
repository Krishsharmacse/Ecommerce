'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, authService } from '@/lib/auth';

interface LoginResult {
    success: boolean;
    message: string;
    needsVerification?: boolean;
    requires2FA?: boolean;
    tempToken?: string;
    useGoogle?: boolean;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isLoggedIn: boolean;
    isOwner: boolean;
    isAdmin: boolean;            // legacy alias
    isManager: boolean;
    isApprovedManager: boolean;
    isShopkeeper: boolean;
    isApprovedShopkeeper: boolean;
    login: (email: string, password: string) => Promise<LoginResult>;
    register: (data: { firstname: string; lastname: string; email: string; password: string; role?: string }) => Promise<{ success: boolean; message: string }>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = async () => {
        try {
            if (authService.getToken()) {
                const u = await authService.getProfile();
                setUser(u);
            }
        } catch {
            const u = authService.getUser();
            setUser(u);
        }
    };

    useEffect(() => {
        const u = authService.getUser();
        setUser(u);
        if (u && authService.getToken()) {
            authService.getProfile().then(setUser).catch(() => { });
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string): Promise<LoginResult> => {
        try {
            const res = await authService.login({ email, password });

            // 2FA required — don't set user yet, return tempToken for verify-2fa page
            if (res.requires2FA) {
                return {
                    success: true,
                    requires2FA: true,
                    message: res.message,
                    tempToken: res.tempToken,
                };
            }

            // OAuth-only account (no password)
            if (res.useGoogle) {
                return { success: false, message: res.message, useGoogle: true };
            }

            if (res.success && res.user) {
                setUser(res.user);
                return {
                    success: true,
                    message: res.message,
                    needsVerification: !res.user.isverified,
                };
            }
            return { success: false, message: res.message };
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string; useGoogle?: boolean; requires2FA?: boolean } } };
            const data = e?.response?.data;
            return {
                success: false,
                message: data?.message || 'Login failed',
                useGoogle: data?.useGoogle,
            };
        }
    };

    const register = async (data: { firstname: string; lastname: string; email: string; password: string; role?: string }) => {
        try {
            const res = await authService.register(data);
            if (res.success && res.user) setUser(res.user);
            return { success: res.success, message: res.message };
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            return { success: false, message: e?.response?.data?.message || 'Registration failed' };
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const role = user?.role;
    const isOwnerRole = role === 'owner' || role === 'admin';
    const isManagerRole = role === 'manager' || isOwnerRole;
    const isShopkeeperRole = role === 'shopkeeper' || isManagerRole;

    return (
        <AuthContext.Provider value={{
            user, isLoading,
            isLoggedIn: !!user,
            isOwner: isOwnerRole,
            isAdmin: isOwnerRole,
            isManager: isManagerRole,
            isApprovedManager: isOwnerRole || (role === 'manager' && !!user?.isManagerApproved),
            isShopkeeper: isShopkeeperRole,
            isApprovedShopkeeper: isManagerRole || (role === 'shopkeeper' && !!user?.isShopkeeperApproved),
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
