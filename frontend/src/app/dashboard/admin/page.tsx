'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { shopService, ShopRequest } from '@/lib/shops';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import IncomeGraph, { IncomeTrendItem } from '@/components/admin/IncomeGraph';

type Tab = 'overview' | 'requests' | 'shops' | 'users';
type RequestSubTab = 'opening' | 'deletion';

interface PlatformTopShop {
    _id?: string;
    id?: string;
    name: string;
    category?: string;
    ownerId?: { firstname?: string; email?: string };
    totalRevenue?: number;
    totalOrders?: number;
    status?: string;
}

interface PlatformStats {
    totalRevenue?: number;
    totalOrders?: number;
    totalProducts?: number;
    totalShops?: number;
    approvedShops?: number;
    pendingShops?: number;
    topShops?: PlatformTopShop[];
    chartData?: Array<{ date: string; revenue: number }>;
    salesTrend?: Array<{ date: string; label: string; revenue: number; orders: number }>;
    incomeTrend?: IncomeTrendItem[];
    [key: string]: unknown;
}

interface UserStats {
    users?: {
        total?: number;
        vendors?: number;
        customers?: number;
        admins?: number;
    };
}

interface UserRow {
    _id: string;
    id?: string;
    firstname: string;
    lastname?: string;
    email: string;
    phone?: string;
    role: string;
    isverified: boolean;
    isVendor?: boolean;
    isAdmin?: boolean;
    isCustomer?: boolean;
    shopId?: { id?: string; name: string; status: string; slug?: string } | null;
    latestShopRequest?: { type: string; status: string } | null;
    createdAt?: string;
}

interface ShopRow {
    _id: string;
    id?: string;
    name: string;
    slug?: string;
    category?: string;
    status: string;
    ownerId?: { firstname: string; email: string };
    totalRevenue?: number;
    totalProducts?: number;
    totalOrders?: number;
    createdAt?: string;
}

export default function AdminDashboardPage() {
    const { user } = useAuth();
    const [tab, setTab] = useState<Tab>('overview');
    const [reqSubTab, setReqSubTab] = useState<RequestSubTab>('opening');

    // Data State
    const [requests, setRequests] = useState<ShopRequest[]>([]);
    const [shops, setShops] = useState<ShopRow[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);

    // Filters & Search
    const [userFilter, setUserFilter] = useState<'all' | 'customer' | 'vendor' | 'admin'>('all');
    const [userSearch, setUserSearch] = useState('');
    const [shopFilter, setShopFilter] = useState<'all' | 'approved' | 'pending' | 'suspended'>('all');
    const [shopSearch, setShopSearch] = useState('');

    // Action Modals
    const [reviewModalReq, setReviewModalReq] = useState<{ req: ShopRequest; action: 'approve' | 'reject' } | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [processingReview, setProcessingReview] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled([
                shopService.listShopRequestsAdmin(),
                shopService.getAllAdmin({ status: shopFilter !== 'all' ? shopFilter : undefined }),
                api.get('/users/all', { params: { role: userFilter !== 'all' ? userFilter : undefined } }),
                shopService.getPlatformSales(14),
                api.get('/users/stats'),
            ]);

            const [reqsRes, shopsRes, usersRes, psRes, usRes] = results;

            if (reqsRes.status === 'fulfilled') setRequests(reqsRes.value || []);
            if (shopsRes.status === 'fulfilled') setShops(shopsRes.value?.shops || []);
            if (usersRes.status === 'fulfilled') setUsers(usersRes.value?.data?.users || []);
            if (psRes.status === 'fulfilled') setPlatformStats(psRes.value || null);
            if (usRes.status === 'fulfilled') setUserStats(usRes.value?.data?.stats || null);

            // Log any specific rejected call for debugging
            results.forEach((r, idx) => {
                if (r.status === 'rejected') {
                    const endpoints = ['listShopRequestsAdmin', 'getAllAdmin', 'users/all', 'getPlatformSales', 'users/stats'];
                    console.warn(`Admin endpoint failed [${endpoints[idx]}]:`, r.reason?.response?.data || r.reason?.message);
                }
            });
        } catch (err) {
            console.error('Failed to load admin data', err);
        } finally {
            setLoading(false);
        }
    }, [userFilter, shopFilter]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    // Review Request (Approve or Reject)
    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewModalReq) return;
        setProcessingReview(true);
        try {
            await shopService.reviewShopRequestAdmin(
                reviewModalReq.req.id,
                reviewModalReq.action,
                adminNote
            );
            toast.success(`Request ${reviewModalReq.action === 'approve' ? 'approved' : 'declined'} successfully`);
            setReviewModalReq(null);
            setAdminNote('');
            await loadData();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error?.response?.data?.message || 'Failed to review request');
        } finally {
            setProcessingReview(false);
        }
    };

    // Promote / Demote User Role
    const handleChangeUserRole = async (targetUserId: string, nextRole: 'VENDOR' | 'CUSTOMER' | 'ADMIN', userName: string) => {
        const actionLabel = nextRole === 'VENDOR' ? 'promote this user to Vendor' : nextRole === 'CUSTOMER' ? 'demote this user to Customer' : 'make this user an Admin';
        if (!confirm(`Are you sure you want to ${actionLabel} (${userName})?`)) return;

        try {
            await api.post('/users/change-role', { userId: targetUserId, role: nextRole });
            toast.success(`Role updated: ${userName} is now ${nextRole}`);
            await loadData();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error?.response?.data?.message || 'Failed to change role');
        }
    };

    // Toggle Shop Status
    const handleShopStatus = async (shopId: string, status: string) => {
        try {
            await shopService.updateStatus(shopId, status);
            toast.success(`Shop status updated to ${status}`);
            await loadData();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error?.response?.data?.message || 'Failed to update shop status');
        }
    };

    const pendingOpenReqs = requests.filter(r => r.type === 'OPEN_SHOP' && r.status === 'PENDING');
    const pendingDeleteReqs = requests.filter(r => r.type === 'DELETE_SHOP' && r.status === 'PENDING');
    const totalPendingRequests = pendingOpenReqs.length + pendingDeleteReqs.length;

    const filteredUsers = users.filter(u => {
        if (!userSearch.trim()) return true;
        const q = userSearch.toLowerCase();
        return u.firstname?.toLowerCase().includes(q) || u.lastname?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    });

    const filteredShops = shops.filter(s => {
        if (!shopSearch.trim()) return true;
        const q = shopSearch.toLowerCase();
        return s.name?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q) || s.ownerId?.email?.toLowerCase().includes(q);
    });

    const sidebarItems = [
        { id: 'overview', icon: '📊', label: 'Platform Overview' },
        { id: 'requests', icon: '📬', label: 'Shop Requests', badge: totalPendingRequests },
        { id: 'shops', icon: '🏪', label: 'Storefront Directory', badge: shops.filter(s => s.status === 'pending').length },
        { id: 'users', icon: '👥', label: 'User Management' },
    ];

    return (
        <div className="admin-dashboard min-h-screen bg-zinc-950 text-zinc-100 flex font-sans antialiased">
            {/* 1. Dedicated Admin Sidebar (Clean fixed left shell) */}
            <aside className="admin-dashboard__sidebar w-64 fixed inset-y-0 left-0 z-30 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between p-4 hidden md:flex">
                <div className="space-y-4">
                    {/* Admin HQ Brand Header */}
                    <div className="flex items-center gap-3 px-2 py-2.5 border-b border-zinc-800/80">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-lg font-bold text-white shadow-md shadow-pink-950 flex-shrink-0">
                            ⚡
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm font-bold text-white tracking-tight">Admin HQ</div>
                            <div className="text-[10px] font-mono text-pink-400 font-semibold tracking-wide uppercase">
                                Command Center
                            </div>
                        </div>
                    </div>

                    {/* Admin Profile Card (Clean inline design without border clipping) */}
                    <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                                Privileged Session
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                                ADMIN
                            </span>
                        </div>
                        <div className="flex items-center gap-2.5 pt-1">
                            <div className="w-8 h-8 rounded-lg bg-pink-600/20 border border-pink-500/30 text-pink-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                {user?.firstname ? user.firstname[0].toUpperCase() : 'A'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-white truncate">
                                    {user?.firstname || 'Administrator'} {user?.lastname || ''}
                                </div>
                                <div className="text-[11px] text-zinc-400 truncate">
                                    {user?.email || 'admin@ecommerce.com'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Command Menu Items */}
                    <div className="space-y-1">
                        <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                            Platform Navigation
                        </div>
                        {sidebarItems.map(item => {
                            const isActive = tab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setTab(item.id as Tab)}
                                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                                        isActive
                                            ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                                            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
                                    }`}
                                >
                                    <span className="text-base">{item.icon}</span>
                                    <span className="flex-1">{item.label}</span>
                                    {item.badge !== undefined && item.badge > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-pink-500 text-white shadow-sm">
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Quick Links */}
                <div className="pt-4 border-t border-zinc-800 space-y-1">
                    <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                        External Quick Links
                    </div>
                    <Link
                        href="/shop"
                        className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-all"
                    >
                        <span>🛍️</span> Marketplace Storefront
                    </Link>
                    <Link
                        href="/dashboard/customer"
                        className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-all"
                    >
                        <span>📦</span> Customer View
                    </Link>
                </div>
            </aside>

            {/* Mobile Nav Bar (Bottom pinned on small screens) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800 p-2 flex justify-around">
                {sidebarItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setTab(item.id as Tab)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-semibold transition-all ${
                            tab === item.id ? 'text-pink-400' : 'text-zinc-400'
                        }`}
                    >
                        <span className="text-base">{item.icon}</span>
                        <span>{item.label.split(' ')[0]}</span>
                    </button>
                ))}
            </div>

            {/* 2. Main Content Area (Properly offset with md:pl-64 so it is never obscured by the sidebar) */}
            <div className="admin-dashboard__content md:pl-64 flex flex-col flex-1 min-w-0 w-full bg-zinc-950 min-h-screen">
                {/* Dedicated Top Admin Header */}
                <header className="h-16 border-b border-zinc-800 px-6 sm:px-8 flex items-center justify-between bg-zinc-950/80 backdrop-blur sticky top-0 z-20">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                            <span className="text-zinc-400">Admin</span>
                            <span className="text-zinc-600">/</span>
                            <span className="text-zinc-200 font-semibold">
                                {tab === 'overview'
                                    ? 'Platform Command Center'
                                    : tab === 'requests'
                                    ? 'Shop Approval Queue'
                                    : tab === 'shops'
                                    ? 'Storefront Directory'
                                    : 'User Governance'}
                            </span>
                        </div>
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Production Live
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 hover:text-white transition-all flex items-center gap-2"
                            title="Refresh telemetry"
                        >
                            <span className={loading ? 'animate-spin' : ''}>🔄</span>
                            <span>Refresh Metrics</span>
                        </button>
                    </div>
                </header>

                {/* Page Body */}
                <main className="admin-dashboard__body w-full max-w-7xl p-6 sm:p-8 md:p-10 space-y-8 flex-1 pb-24 md:pb-12">
                    {/* TAB 1: PLATFORM OVERVIEW */}
                    {tab === 'overview' && (
                        <div className="space-y-8">
                            {/* Title Block */}
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                    Platform Command Center
                                </h1>
                                <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-normal">
                                    Real-time marketplace revenue, storefront activity, and administrative workload
                                </p>
                            </div>

                            {/* 4 Standardized Metric Cards (Responsive grid, no vertical clipping) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                {/* Card 1: Gross Platform Revenue */}
                                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-xs font-mono uppercase font-semibold tracking-wider text-zinc-400">
                                            Gross Revenue
                                        </span>
                                        <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center flex-shrink-0 text-base">
                                            💰
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                            ₹{(platformStats?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                        <p className="text-xs text-zinc-400 mt-1.5 leading-normal">
                                            From {platformStats?.totalOrders || 0} completed orders
                                        </p>
                                    </div>
                                </div>

                                {/* Card 2: Pending Requests */}
                                <div
                                    onClick={() => setTab('requests')}
                                    className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/40 transition-all cursor-pointer flex flex-col justify-between group"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-xs font-mono uppercase font-semibold tracking-wider text-zinc-400 group-hover:text-amber-300 transition-colors">
                                            Pending Requests
                                        </span>
                                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 text-base">
                                            📬
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 tracking-tight">
                                            {totalPendingRequests}
                                        </div>
                                        <p className="text-xs text-zinc-400 mt-1.5 leading-normal">
                                            {pendingOpenReqs.length} opening · {pendingDeleteReqs.length} deletion
                                        </p>
                                    </div>
                                </div>

                                {/* Card 3: Active Storefronts */}
                                <div
                                    onClick={() => setTab('shops')}
                                    className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col justify-between group"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-xs font-mono uppercase font-semibold tracking-wider text-zinc-400 group-hover:text-cyan-300 transition-colors">
                                            Active Storefronts
                                        </span>
                                        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 text-base">
                                            🏪
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                            {platformStats?.approvedShops || 0}
                                        </div>
                                        <p className="text-xs text-zinc-400 mt-1.5 leading-normal">
                                            Out of {platformStats?.totalShops || 0} registered stores
                                        </p>
                                    </div>
                                </div>

                                {/* Card 4: Registered Users */}
                                <div
                                    onClick={() => setTab('users')}
                                    className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-blue-500/40 transition-all cursor-pointer flex flex-col justify-between group"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-xs font-mono uppercase font-semibold tracking-wider text-zinc-400 group-hover:text-blue-300 transition-colors">
                                            Community Members
                                        </span>
                                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 text-base">
                                            👥
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                            {userStats?.users?.total || users.length}
                                        </div>
                                        <p className="text-xs text-zinc-400 mt-1.5 leading-normal">
                                            {userStats?.users?.vendors || 0} verified vendors active
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Income & Telemetry Graph Component */}
                            <IncomeGraph
                                trend={platformStats?.incomeTrend}
                                totalRevenue={platformStats?.totalRevenue}
                            />

                            {/* Top Grossing Storefronts Section */}
                            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-base font-bold text-white tracking-tight">
                                            Top Grossing Storefronts
                                        </h2>
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            Merchant stores ranked by verified completed sales volume
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setTab('shops')}
                                        className="text-xs font-semibold text-pink-400 hover:text-pink-300 transition-colors"
                                    >
                                        View All Stores →
                                    </button>
                                </div>

                                {!platformStats?.topShops || platformStats.topShops.length === 0 ? (
                                    /* Structured Empty State (WCAG AA Contrast compliant) */
                                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-8 text-center flex flex-col items-center justify-center space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-xl text-zinc-400">
                                            🏪
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-zinc-200">
                                                No Storefront Sales Recorded Yet
                                            </h3>
                                            <p className="text-xs text-zinc-400 mt-1 max-w-sm leading-relaxed">
                                                When approved merchant storefronts accept customer checkouts, top stores ranked by revenue volume will display here.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setTab('shops')}
                                            className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors border border-zinc-700"
                                        >
                                            Inspect Storefront Directory
                                        </button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-mono tracking-wider">
                                                    <th className="py-3 px-3">Store Name</th>
                                                    <th className="py-3 px-3">Category</th>
                                                    <th className="py-3 px-3">Vendor / Merchant</th>
                                                    <th className="py-3 px-3">Gross Sales</th>
                                                    <th className="py-3 px-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/60">
                                                {platformStats.topShops.map((s: PlatformTopShop) => (
                                                    <tr key={s._id || s.name} className="hover:bg-zinc-800/30 transition-colors">
                                                        <td className="py-3.5 px-3 font-bold text-white flex items-center gap-2">
                                                            <span>🏪</span> {s.name}
                                                        </td>
                                                        <td className="py-3.5 px-3">
                                                            <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px]">
                                                                {s.category}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-3 text-zinc-300">
                                                            {s.ownerId?.firstname} <span className="text-zinc-400 text-[11px]">({s.ownerId?.email})</span>
                                                        </td>
                                                        <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">
                                                            ₹{(s.totalRevenue ?? 0).toFixed(2)}
                                                        </td>
                                                        <td className="py-3.5 px-3">
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                                {s.status?.toUpperCase()}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: SHOP REQUESTS HUB */}
                    {tab === 'requests' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                                        <span>Store Approval Queue</span>
                                        {totalPendingRequests > 0 && (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-pink-500 text-white">
                                                {totalPendingRequests} Pending
                                            </span>
                                        )}
                                    </h1>
                                    <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                                        Review vendor storefront creation applications and closure requests
                                    </p>
                                </div>

                                {/* Sub-tabs */}
                                <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
                                    <button
                                        onClick={() => setReqSubTab('opening')}
                                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                                            reqSubTab === 'opening'
                                                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                                                : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        <span>✨ Opening Applications</span>
                                        <span className="px-1.5 py-0.2 rounded-full bg-zinc-950 text-zinc-300 text-[10px] border border-zinc-700">
                                            {pendingOpenReqs.length}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setReqSubTab('deletion')}
                                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                                            reqSubTab === 'deletion'
                                                ? 'bg-red-500/20 text-red-300 border border-red-500/30 shadow-sm'
                                                : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        <span>⚠️ Deletion Requests</span>
                                        <span className="px-1.5 py-0.2 rounded-full bg-zinc-950 text-zinc-300 text-[10px] border border-zinc-700">
                                            {pendingDeleteReqs.length}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* SUBTAB: OPENING REQUESTS */}
                            {reqSubTab === 'opening' && (
                                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 backdrop-blur-sm">
                                    <div>
                                        <h2 className="text-base font-bold text-white">Store Opening Applications</h2>
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            Vendors requesting authorization to launch and publish a live storefront
                                        </p>
                                    </div>

                                    {pendingOpenReqs.length === 0 ? (
                                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-12 text-center flex flex-col items-center justify-center space-y-3">
                                            <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-xl text-zinc-400">
                                                ✨
                                            </div>
                                            <h3 className="text-sm font-semibold text-zinc-200">No Pending Applications</h3>
                                            <p className="text-xs text-zinc-400 max-w-sm">
                                                All vendor store creation requests have been reviewed and resolved.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-mono tracking-wider">
                                                        <th className="py-3 px-3">Proposed Store</th>
                                                        <th className="py-3 px-3">Category</th>
                                                        <th className="py-3 px-3">Applicant / Vendor</th>
                                                        <th className="py-3 px-3">Description</th>
                                                        <th className="py-3 px-3">Applied</th>
                                                        <th className="py-3 px-3 text-right">Decision</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-800/60">
                                                    {pendingOpenReqs.map(r => (
                                                        <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                                                            <td className="py-4 px-3 font-bold text-white">
                                                                <div className="text-sm">{r.shopName}</div>
                                                                <div className="text-[11px] font-mono text-cyan-400">/shop/{r.slug}</div>
                                                            </td>
                                                            <td className="py-4 px-3">
                                                                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold">
                                                                    {r.category || 'General'}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 px-3">
                                                                <div className="font-bold text-zinc-200">{r.vendor?.name}</div>
                                                                <div className="text-zinc-400 text-[11px]">{r.vendor?.email}</div>
                                                                {r.vendor?.phone && <div className="text-zinc-400 text-[11px]">{r.vendor?.phone}</div>}
                                                            </td>
                                                            <td className="py-4 px-3 max-w-xs text-zinc-300 leading-relaxed">
                                                                {r.description || '—'}
                                                            </td>
                                                            <td className="py-4 px-3 text-zinc-400 text-[11px]">
                                                                {new Date(r.createdAt).toLocaleDateString()}
                                                            </td>
                                                            <td className="py-4 px-3 text-right space-x-2">
                                                                <button
                                                                    onClick={() => setReviewModalReq({ req: r, action: 'approve' })}
                                                                    className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950 transition-all"
                                                                >
                                                                    ✓ Approve Store
                                                                </button>
                                                                <button
                                                                    onClick={() => setReviewModalReq({ req: r, action: 'reject' })}
                                                                    className="px-3.5 py-1.5 rounded-xl font-semibold text-xs bg-zinc-800 hover:bg-red-500/20 text-red-300 border border-zinc-700 hover:border-red-500/30 transition-all"
                                                                >
                                                                    ✕ Decline
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SUBTAB: DELETION REQUESTS */}
                            {reqSubTab === 'deletion' && (
                                <div className="rounded-2xl border border-red-500/20 bg-zinc-900/60 p-6 space-y-4 backdrop-blur-sm">
                                    <div>
                                        <h2 className="text-base font-bold text-red-300">Store Closure & Deletion Requests</h2>
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            Stores requesting administrative closure and archive status
                                        </p>
                                    </div>

                                    {pendingDeleteReqs.length === 0 ? (
                                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-12 text-center flex flex-col items-center justify-center space-y-3">
                                            <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-xl text-zinc-400">
                                                🛡️
                                            </div>
                                            <h3 className="text-sm font-semibold text-zinc-200">No Closure Requests</h3>
                                            <p className="text-xs text-zinc-400 max-w-sm">
                                                All approved vendor storefronts are operating normally with zero closure petitions.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-mono tracking-wider">
                                                        <th className="py-3 px-3">Store Name</th>
                                                        <th className="py-3 px-3">Vendor</th>
                                                        <th className="py-3 px-3">Catalog & Revenue</th>
                                                        <th className="py-3 px-3">Stated Reason</th>
                                                        <th className="py-3 px-3">Requested On</th>
                                                        <th className="py-3 px-3 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-800/60">
                                                    {pendingDeleteReqs.map(r => (
                                                        <tr key={r.id} className="hover:bg-red-950/10 transition-colors">
                                                            <td className="py-4 px-3 font-bold text-red-200 text-sm">
                                                                {r.shopName}
                                                            </td>
                                                            <td className="py-4 px-3">
                                                                <div className="font-bold text-zinc-200">{r.vendor?.name}</div>
                                                                <div className="text-zinc-400 text-[11px]">{r.vendor?.email}</div>
                                                            </td>
                                                            <td className="py-4 px-3 text-zinc-300">
                                                                <div>{r.shopStats?.totalProducts || 0} products</div>
                                                                <div className="font-mono text-cyan-400 font-bold">
                                                                    ₹{(r.shopStats?.totalRevenue || 0).toFixed(2)} sales
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-3 max-w-sm font-medium text-amber-200/90 leading-relaxed bg-zinc-950/60 p-2.5 rounded-xl border border-amber-500/20">
                                                                &ldquo;{r.reason}&rdquo;
                                                            </td>
                                                            <td className="py-4 px-3 text-zinc-400 text-[11px]">
                                                                {new Date(r.createdAt).toLocaleDateString()}
                                                            </td>
                                                            <td className="py-4 px-3 text-right space-x-2">
                                                                <button
                                                                    onClick={() => setReviewModalReq({ req: r, action: 'approve' })}
                                                                    className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950 transition-all"
                                                                >
                                                                    Confirm Closure
                                                                </button>
                                                                <button
                                                                    onClick={() => setReviewModalReq({ req: r, action: 'reject' })}
                                                                    className="px-3.5 py-1.5 rounded-xl font-semibold text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all"
                                                                >
                                                                    Decline
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: STOREFRONT DIRECTORY */}
                    {tab === 'shops' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                        Storefront Directory
                                    </h1>
                                    <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                                        Global registry of merchant stores with activate and suspension governance
                                    </p>
                                </div>

                                {/* Search & Filter */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <input
                                        type="text"
                                        value={shopSearch}
                                        onChange={e => setShopSearch(e.target.value)}
                                        placeholder="Search by store or owner..."
                                        className="px-3 py-1.5 text-xs rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 w-56"
                                    />

                                    <div className="admin-filter-group flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                                        {(['all', 'approved', 'pending', 'suspended'] as const).map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setShopFilter(s)}
                                                className={`px-3 py-1 text-[11px] rounded-lg font-mono font-bold uppercase transition-all ${
                                                    shopFilter === s ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm' : 'text-zinc-400 hover:text-white'
                                                }`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
                                {filteredShops.length === 0 ? (
                                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-12 text-center flex flex-col items-center justify-center space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-xl text-zinc-400">
                                            🔍
                                        </div>
                                        <h3 className="text-sm font-semibold text-zinc-200">No Stores Matching Filter</h3>
                                        <p className="text-xs text-zinc-400 max-w-sm">
                                            No storefronts matched your current filter or search criteria.
                                        </p>
                                        <button
                                            onClick={() => { setShopFilter('all'); setShopSearch(''); }}
                                            className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors border border-zinc-700"
                                        >
                                            Reset Filters
                                        </button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-mono tracking-wider">
                                                    <th className="py-3 px-3">Store Name</th>
                                                    <th className="py-3 px-3">Owner / Merchant</th>
                                                    <th className="py-3 px-3">Revenue</th>
                                                    <th className="py-3 px-3">Products</th>
                                                    <th className="py-3 px-3">Status</th>
                                                    <th className="py-3 px-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/60">
                                                {filteredShops.map(s => (
                                                    <tr key={s._id || s.id} className="hover:bg-zinc-800/30 transition-colors">
                                                        <td className="py-3.5 px-3">
                                                            <div className="font-bold text-white text-sm">{s.name}</div>
                                                            <div className="text-[11px] font-mono text-cyan-400">/shop/{s.slug}</div>
                                                        </td>
                                                        <td className="py-3.5 px-3">
                                                            <div className="text-zinc-200 font-medium">{s.ownerId?.firstname || '—'}</div>
                                                            <div className="text-zinc-400 text-[11px]">{s.ownerId?.email}</div>
                                                        </td>
                                                        <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">
                                                            ₹{(s.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-3.5 px-3 text-zinc-300">
                                                            {s.totalProducts || 0} items
                                                        </td>
                                                        <td className="py-3.5 px-3">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                                                                s.status === 'approved'
                                                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                                                    : s.status === 'pending'
                                                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                                    : 'bg-red-500/15 text-red-300 border-red-500/30'
                                                            }`}>
                                                                {s.status?.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-3 text-right space-x-2">
                                                            {s.status !== 'approved' && (
                                                                <button
                                                                    onClick={() => handleShopStatus(s.id || s._id, 'approved')}
                                                                    className="px-3 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 font-bold text-[11px] transition-all"
                                                                >
                                                                    Activate
                                                                </button>
                                                            )}
                                                            {s.status === 'approved' && (
                                                                <button
                                                                    onClick={() => handleShopStatus(s.id || s._id, 'suspended')}
                                                                    className="px-3 py-1 rounded-xl bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 font-bold text-[11px] transition-all"
                                                                >
                                                                    Suspend
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: USER MANAGEMENT & VENDOR PROMOTION */}
                    {tab === 'users' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                        User Governance & Promotion
                                    </h1>
                                    <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                                        Promote verified customers to Vendor role to permit storefront creation requests
                                    </p>
                                </div>

                                {/* Search & Filter */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <input
                                        type="text"
                                        value={userSearch}
                                        onChange={e => setUserSearch(e.target.value)}
                                        placeholder="Search by name or email..."
                                        className="px-3 py-1.5 text-xs rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 w-56"
                                    />

                                    <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                                        {(['all', 'customer', 'vendor', 'admin'] as const).map(rf => (
                                            <button
                                                key={rf}
                                                onClick={() => setUserFilter(rf)}
                                                className={`px-3 py-1 text-[11px] rounded-lg font-mono font-bold uppercase transition-all ${
                                                    userFilter === rf ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm' : 'text-zinc-400 hover:text-white'
                                                }`}
                                            >
                                                {rf}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
                                {filteredUsers.length === 0 ? (
                                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-12 text-center flex flex-col items-center justify-center space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-xl text-zinc-400">
                                            👥
                                        </div>
                                        <h3 className="text-sm font-semibold text-zinc-200">No Users Found</h3>
                                        <p className="text-xs text-zinc-400 max-w-sm">
                                            No user accounts matched the given search or role criteria.
                                        </p>
                                        <button
                                            onClick={() => { setUserFilter('all'); setUserSearch(''); }}
                                            className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors border border-zinc-700"
                                        >
                                            Reset Filters
                                        </button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-mono tracking-wider">
                                                    <th className="py-3 px-3">User Profile</th>
                                                    <th className="py-3 px-3">Email</th>
                                                    <th className="py-3 px-3">Current Role</th>
                                                    <th className="py-3 px-3">Associated Store</th>
                                                    <th className="py-3 px-3">Registered</th>
                                                    <th className="py-3 px-3 text-right">Role Governance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/60">
                                                {filteredUsers.map(u => {
                                                    const isVendor = u.role === 'vendor' || u.role === 'manager';
                                                    const isAdmin = u.role === 'admin' || u.role === 'owner';
                                                    const isCustomer = !isVendor && !isAdmin;

                                                    return (
                                                        <tr key={u._id || u.id} className="hover:bg-zinc-800/30 transition-colors">
                                                            <td className="py-3.5 px-3">
                                                                <div className="font-bold text-white text-sm">
                                                                    {u.firstname} {u.lastname}
                                                                </div>
                                                                {u.phone && <div className="text-[11px] text-zinc-400">{u.phone}</div>}
                                                            </td>
                                                            <td className="py-3.5 px-3 font-medium text-zinc-300">
                                                                {u.email}
                                                            </td>
                                                            <td className="py-3.5 px-3">
                                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                                                                    isAdmin
                                                                        ? 'bg-pink-500/15 text-pink-300 border-pink-500/30'
                                                                        : isVendor
                                                                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                                                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                                                }`}>
                                                                    {isAdmin ? 'ADMIN' : isVendor ? 'VENDOR' : 'CUSTOMER'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 px-3">
                                                                {u.shopId ? (
                                                                    <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                                                                        <span>🏪</span> {u.shopId.name}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-zinc-500">—</span>
                                                                )}
                                                            </td>
                                                            <td className="py-3.5 px-3 text-zinc-400 text-[11px]">
                                                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                                                            </td>
                                                            <td className="py-3.5 px-3 text-right space-x-2">
                                                                {isCustomer && (
                                                                    <button
                                                                        onClick={() => handleChangeUserRole(u.id || u._id, 'VENDOR', u.firstname)}
                                                                        className="px-3 py-1.5 rounded-xl font-bold text-xs bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-black border border-cyan-500/40 shadow-sm transition-all"
                                                                    >
                                                                        ⭐ Promote to Vendor
                                                                    </button>
                                                                )}
                                                                {isVendor && (
                                                                    <button
                                                                        onClick={() => handleChangeUserRole(u.id || u._id, 'CUSTOMER', u.firstname)}
                                                                        className="px-3 py-1.5 rounded-xl font-semibold text-xs bg-zinc-800 hover:bg-amber-500/20 text-amber-300 border border-zinc-700 hover:border-amber-500/30 transition-all"
                                                                    >
                                                                        ⬇ Demote to Customer
                                                                    </button>
                                                                )}
                                                                {isAdmin && (
                                                                    <span className="text-zinc-500 text-[11px] font-mono">Protected</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* REVIEW DECISION MODAL */}
            {reviewModalReq && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4 shadow-2xl animate-fade-up">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                {reviewModalReq.action === 'approve' ? (
                                    reviewModalReq.req.type === 'OPEN_SHOP' ? '✅ Approve Store Opening' : '⚠️ Confirm Store Closure'
                                ) : (
                                    '✕ Decline Request'
                                )}
                            </h2>
                            <button
                                onClick={() => setReviewModalReq(null)}
                                className="text-zinc-400 hover:text-white text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
                            <p className="text-zinc-300 leading-relaxed">
                                {reviewModalReq.action === 'approve' ? (
                                    reviewModalReq.req.type === 'OPEN_SHOP'
                                        ? `Approving '${reviewModalReq.req.shopName}' will set the storefront live on the marketplace and notify vendor ${reviewModalReq.req.vendor?.name}.`
                                        : `Approving store deletion for '${reviewModalReq.req.shopName}' will archive the store and unpublish all its products.`
                                ) : (
                                    `Declining this request will keep the current store state unchanged and notify vendor ${reviewModalReq.req.vendor?.name}.`
                                )}
                            </p>

                            <div className="space-y-1.5">
                                <label className="font-semibold text-zinc-200">
                                    Decision Note / Feedback (Optional)
                                </label>
                                <textarea
                                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                                    rows={3}
                                    value={adminNote}
                                    onChange={e => setAdminNote(e.target.value)}
                                    placeholder="Add notes, reason for approval/decline, or advice for the vendor..."
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                                    onClick={() => setReviewModalReq(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processingReview}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        reviewModalReq.action === 'approve'
                                            ? reviewModalReq.req.type === 'DELETE_SHOP'
                                                ? 'bg-red-600 hover:bg-red-500 text-white'
                                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                            : 'bg-red-600 hover:bg-red-500 text-white'
                                    }`}
                                >
                                    {processingReview ? 'Processing...' : reviewModalReq.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
