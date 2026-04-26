'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { shopService } from '@/lib/shops';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'shops' | 'users' | 'managers';

interface UserRow { _id: string; firstname: string; lastname?: string; email: string; role: string; isverified: boolean; isManagerApproved?: boolean; shopId?: { name: string; status: string } | null; createdAt?: string }
interface ShopRow { _id: string; name: string; category: string; status: string; ownerId?: { firstname: string; email: string }; totalRevenue?: number; totalProducts?: number; totalOrders?: number; createdAt?: string }

export default function OwnerDashboardPage() {
    const { user } = useAuth();
    const [tab, setTab] = useState<Tab>('overview');
    const [shops, setShops] = useState<ShopRow[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [platformStats, setPlatformStats] = useState<{ totalShops: number; approvedShops: number; totalOrders: number; totalRevenue: number; topShops: ShopRow[] } | null>(null);
    const [userStats, setUserStats] = useState<{ users: { total: number; managers: number; owners: number; pendingManagers: number } } | null>(null);
    const [loading, setLoading] = useState(true);
    const [userFilter, setUserFilter] = useState<'all' | 'user' | 'manager' | 'owner'>('all');
    const [shopFilter, setShopFilter] = useState<'all' | 'pending' | 'approved' | 'suspended'>('all');

    const load = async () => {
        setLoading(true);
        try {
            const [shopRes, userRes, ps, us] = await Promise.all([
                shopService.getAllAdmin({ status: shopFilter !== 'all' ? shopFilter : undefined }),
                api.get('/user/all', { params: { role: userFilter !== 'all' ? userFilter : undefined } }),
                shopService.getPlatformSales(30),
                api.get('/user/stats'),
            ]);
            setShops(shopRes.shops);
            setUsers(userRes.data.users);
            setPlatformStats(ps);
            setUserStats(us.data.stats);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [shopFilter, userFilter]);

    const handleShopStatus = async (shopId: string, status: string, note?: string) => {
        try {
            await shopService.updateStatus(shopId, status, note);
            toast.success(`Shop ${status}`);
            load();
        } catch { toast.error('Failed to update shop'); }
    };

    const handleChangeRole = async (userId: string, role: string) => {
        if (!confirm(`Change this user's role to ${role}?`)) return;
        try {
            await api.post('/user/change-role', { userId, role });
            toast.success(`Role changed to ${role}`);
            load();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Failed');
        }
    };

    const handleApproveManager = async (userId: string, action: 'approve' | 'reject') => {
        try {
            await api.post('/user/approve-manager', { userId, action });
            toast.success(action === 'approve' ? 'Manager approved!' : 'Manager rejected');
            load();
        } catch { toast.error('Failed'); }
    };

    const pendingManagers = users.filter(u => u.role === 'manager' && !u.isManagerApproved);
    const pendingShops = shops.filter(s => s.status === 'pending');

    const sidebarItems = [
        { id: 'overview', icon: '📊', label: 'Platform Overview' },
        { id: 'shops', icon: '🏪', label: 'All Shops', badge: pendingShops.length },
        { id: 'managers', icon: '👨‍💼', label: 'Managers', badge: pendingManagers.length },
        { id: 'users', icon: '👥', label: 'All Users' },
    ];

    return (
        <div className="dashboard-layout">
            <aside className="sidebar" style={{ background: 'rgba(236,72,153,.015)', borderRightColor: 'rgba(236,72,153,.1)' }}>
                <div className="sidebar-header">
                    <div className="sidebar-brand text-gradient-pink">👑 Owner Panel</div>
                    <div className="sidebar-user">{user?.firstname}</div>
                    <span className="badge badge-pink mt-2">OWNER</span>
                </div>
                <div className="sidebar-section">Management</div>
                {sidebarItems.map(item => (
                    <button key={item.id} className={`sidebar-item${tab === item.id ? ' active owner-tab' : ''}`} onClick={() => setTab(item.id as Tab)}>
                        <span className="sidebar-icon">{item.icon}</span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && <span className="sidebar-badge">{item.badge}</span>}
                    </button>
                ))}
                <div className="sidebar-section" style={{ marginTop: 'auto' }}>Links</div>
                <Link href="/shop" className="sidebar-item"><span className="sidebar-icon">🛍</span>View Store</Link>
            </aside>

            <main className="dashboard-main">
                {loading ? (
                    <div className="page-loader"><div className="spinner spinner-lg" style={{ borderTopColor: '#f9a8d4' }} /></div>
                ) : tab === 'overview' ? (
                    <OverviewTab stats={platformStats} userStats={userStats} topShops={platformStats?.topShops || []} />
                ) : tab === 'shops' ? (
                    <ShopsTab shops={shops} shopFilter={shopFilter} setShopFilter={setShopFilter} onUpdateStatus={handleShopStatus} />
                ) : tab === 'managers' ? (
                    <ManagersTab users={pendingManagers} allManagers={users.filter(u => u.role === 'manager')} onApprove={handleApproveManager} onChangeRole={handleChangeRole} />
                ) : (
                    <UsersTab users={users} userFilter={userFilter} setUserFilter={setUserFilter} onChangeRole={handleChangeRole} />
                )}
            </main>
        </div>
    );
}

/* ─── Overview ─── */
function OverviewTab({ stats, userStats, topShops }: { stats: { totalShops: number; approvedShops: number; totalOrders: number; totalRevenue: number; topShops: ShopRow[] } | null; userStats: { users: { total: number; managers: number; owners: number; pendingManagers: number } } | null; topShops: ShopRow[] }) {
    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="heading-md">Platform Overview</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '.25rem' }}>Last 30 days platform performance</p>
            </div>
            <div className="stats-grid">
                <div className="stat-card pink"><div className="stat-icon pink">💰</div><div className="stat-value text-gradient-pink">₹{stats?.totalRevenue?.toLocaleString('en-IN') ?? '0'}</div><div className="stat-label">Platform Revenue</div></div>
                <div className="stat-card cyan"><div className="stat-icon cyan">🏪</div><div className="stat-value">{stats?.approvedShops ?? 0}<span style={{ fontSize: '.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>/{stats?.totalShops ?? 0}</span></div><div className="stat-label">Active Shops</div></div>
                <div className="stat-card warning"><div className="stat-icon warning">🛒</div><div className="stat-value">{stats?.totalOrders ?? 0}</div><div className="stat-label">Total Orders</div></div>
                <div className="stat-card success"><div className="stat-icon success">👥</div><div className="stat-value">{userStats?.users?.total ?? 0}</div><div className="stat-label">Total Users</div></div>
                <div className="stat-card primary"><div className="stat-icon primary">👨‍💼</div><div className="stat-value">{userStats?.users?.managers ?? 0}</div><div className="stat-label">Managers</div></div>
                <div className="stat-card danger"><div className="stat-icon danger">⏳</div><div className="stat-value">{userStats?.users?.pendingManagers ?? 0}</div><div className="stat-label">Pending Approvals</div></div>
            </div>
            {topShops.length > 0 && (
                <div className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>🏆 Top Shops by Revenue</div>
                    {topShops.map((s, i) => (
                        <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.75rem 0', borderBottom: i < topShops.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                            <span style={{ fontSize: '1.2rem', width: '24px', textAlign: 'center' }}>{'🥇🥈🥉'[i] || '🏅'}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{s.name}</div>
                                <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{s.ownerId?.email}</div>
                            </div>
                            <div className="text-gradient-pink" style={{ fontWeight: 800, fontFamily: 'Outfit,sans-serif' }}>₹{s.totalRevenue?.toLocaleString('en-IN') ?? 0}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Shops Tab ─── */
function ShopsTab({ shops, shopFilter, setShopFilter, onUpdateStatus }: { shops: ShopRow[]; shopFilter: string; setShopFilter: (v: 'all' | 'pending' | 'approved' | 'suspended') => void; onUpdateStatus: (id: string, status: string) => void }) {
    return (
        <div>
            <h1 className="heading-md mb-4">All Shops</h1>
            <div className="filter-chips mb-6">
                {(['all', 'pending', 'approved', 'suspended'] as const).map(f => (
                    <button key={f} className={`filter-chip${shopFilter === f ? ' active' : ''}`} onClick={() => setShopFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
                ))}
            </div>
            <div className="table-container">
                <table>
                    <thead><tr><th>Shop</th><th>Owner</th><th>Category</th><th>Status</th><th>Revenue</th><th>Actions</th></tr></thead>
                    <tbody>
                        {shops.map(s => (
                            <tr key={s._id}>
                                <td><div style={{ fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{s._id.slice(-8)}</div></td>
                                <td><div style={{ fontSize: '.875rem' }}>{s.ownerId?.firstname}</div><div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{s.ownerId?.email}</div></td>
                                <td><span className="badge badge-cyan">{s.category}</span></td>
                                <td><span className={`badge ${s.status === 'approved' ? 'badge-success' : s.status === 'pending' ? 'badge-warning' : s.status === 'suspended' ? 'badge-danger' : 'badge-muted'}`}>{s.status}</span></td>
                                <td style={{ fontWeight: 700 }}>₹{s.totalRevenue?.toLocaleString('en-IN') ?? 0}</td>
                                <td>
                                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                                        {s.status !== 'approved' && <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,.15)', color: '#34d399', borderColor: 'rgba(16,185,129,.25)' }} onClick={() => onUpdateStatus(s._id, 'approved')}>✅ Approve</button>}
                                        {s.status === 'approved' && <button className="btn btn-sm btn-danger" onClick={() => onUpdateStatus(s._id, 'suspended')}>⏸ Suspend</button>}
                                        {s.status === 'suspended' && <button className="btn btn-sm" style={{ background: 'rgba(245,158,11,.1)', color: '#fbbf24' }} onClick={() => onUpdateStatus(s._id, 'approved')}>🔓 Restore</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {shops.length === 0 && <div className="empty-state"><div className="empty-icon">🏪</div><div>No shops found</div></div>}
        </div>
    );
}

/* ─── Managers Tab ─── */
function ManagersTab({ users, allManagers, onApprove, onChangeRole }: { users: UserRow[]; allManagers: UserRow[]; onApprove: (id: string, action: 'approve' | 'reject') => void; onChangeRole: (id: string, role: string) => void }) {
    return (
        <div>
            <h1 className="heading-md mb-2">Managers</h1>
            {users.length > 0 && (
                <div className="alert alert-warning mb-6">⚠ <strong>{users.length}</strong> manager(s) awaiting approval</div>
            )}
            <div className="table-container">
                <table>
                    <thead><tr><th>Manager</th><th>Email</th><th>Shop</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        {allManagers.map(u => (
                            <tr key={u._id}>
                                <td style={{ fontWeight: 600 }}>{u.firstname} {u.lastname}</td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>{u.email}</td>
                                <td>{u.shopId ? <span className="badge badge-cyan">{u.shopId.name}</span> : <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>No shop</span>}</td>
                                <td><span className={`badge ${u.isManagerApproved ? 'badge-success' : 'badge-warning'}`}>{u.isManagerApproved ? 'Approved' : 'Pending'}</span></td>
                                <td>
                                    <div className="flex gap-2">
                                        {!u.isManagerApproved && <>
                                            <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,.15)', color: '#34d399' }} onClick={() => onApprove(u._id, 'approve')}>✅ Approve</button>
                                            <button className="btn btn-sm btn-danger" onClick={() => onApprove(u._id, 'reject')}>❌ Reject</button>
                                        </>}
                                        {u.isManagerApproved && <button className="btn btn-sm btn-danger" onClick={() => onChangeRole(u._id, 'user')}>⬇ Demote</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {allManagers.length === 0 && <div className="empty-state"><div className="empty-icon">👨‍💼</div><div>No managers yet</div></div>}
        </div>
    );
}

/* ─── Users Tab ─── */
function UsersTab({ users, userFilter, setUserFilter, onChangeRole }: { users: UserRow[]; userFilter: string; setUserFilter: (v: 'all' | 'user' | 'manager' | 'owner') => void; onChangeRole: (id: string, role: string) => void }) {
    return (
        <div>
            <h1 className="heading-md mb-4">All Users</h1>
            <div className="alert" style={{ background: 'rgba(99,102,241,.08)', borderColor: 'rgba(99,102,241,.2)', color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '.85rem' }}>
                💡 <strong>Tip:</strong> Promote a user to <strong>Shopkeeper</strong> here, then the manager can assign them to their specific shop from the Staff tab.
            </div>
            <div className="filter-chips mb-6">
                {(['all', 'user', 'manager', 'owner'] as const).map(f => (
                    <button key={f} className={`filter-chip${userFilter === f ? ' active' : ''}`} onClick={() => setUserFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}{f === 'all' ? 's' : 's'}</button>
                ))}
            </div>
            <div className="table-container">
                <table>
                    <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Verified</th><th>Joined</th><th>Change Role</th></tr></thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id}>
                                <td style={{ fontWeight: 600 }}>{u.firstname} {u.lastname}</td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>{u.email}</td>
                                <td>
                                    <span className={`badge ${u.role === 'owner' ? 'badge-pink' : u.role === 'manager' ? 'badge-cyan' : u.role === 'shopkeeper' ? 'badge-warning' : 'badge-muted'}`}>
                                        {u.role === 'shopkeeper' ? '🛒 shopkeeper' : u.role}
                                    </span>
                                </td>
                                <td><span className={`badge ${u.isverified ? 'badge-success' : 'badge-warning'}`}>{u.isverified ? '✓' : '✗'}</span></td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '-'}</td>
                                <td>
                                    <select className="form-input" style={{ padding: '.3rem .6rem', fontSize: '.78rem', width: 'auto' }}
                                        defaultValue={u.role}
                                        onChange={e => { if (e.target.value !== u.role) onChangeRole(u._id, e.target.value); }}>
                                        <option value="user">👤 User</option>
                                        <option value="shopkeeper">🛒 Shopkeeper</option>
                                        <option value="manager">👨‍💼 Manager</option>
                                        <option value="owner">👑 Owner</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {users.length === 0 && <div className="empty-state"><div className="empty-icon">👥</div><div>No users found</div></div>}
        </div>
    );
}
