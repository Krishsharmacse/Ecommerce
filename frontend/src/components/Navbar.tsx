'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const router = useRouter();
    const { user, isLoggedIn, isOwner, isApprovedManager, isApprovedShopkeeper, logout } = useAuth();

    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', h);
        return () => window.removeEventListener('scroll', h);
    }, []);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        router.push('/');
        setDropdownOpen(false);
    };

    const roleLabel = user?.role === 'owner' ? 'Owner'
        : user?.role === 'manager' ? 'Manager'
            : user?.role === 'shopkeeper' ? 'Shopkeeper'
                : null;
    const avatarClass = user?.role === 'owner' ? 'owner-role'
        : user?.role === 'manager' ? 'manager-role'
            : user?.role === 'shopkeeper' ? 'shopkeeper-role'
                : 'user-role';

    const navLinks = [
        { href: '/', label: 'Home' },
        { href: '/shop', label: 'Shop' },
        { href: '/cart', label: '🛒 Cart' },
        ...(isApprovedShopkeeper && user?.role === 'shopkeeper' ? [{ href: '/dashboard/shopkeeper', label: 'My Counter' }] : []),
        ...(isApprovedManager ? [{ href: '/dashboard/manager', label: 'My Store' }] : []),
        ...(isOwner ? [{ href: '/dashboard/owner', label: 'Admin' }] : []),
    ];

    const dropdownLinks = [
        ...(user?.role === 'shopkeeper' && !user?.isShopkeeperApproved ? [{ href: '/dashboard/shopkeeper', label: '⏳ Pending Approval', color: '#fbbf24' }] : []),
        ...(user?.role === 'manager' && !user?.isManagerApproved ? [{ href: '/dashboard/manager', label: '⏳ Pending Approval', color: '#fbbf24' }] : []),
        ...(!user?.isverified ? [{ href: '/verify-otp', label: '✉ Verify Email', color: '#fbbf24' }] : []),
        ...(isApprovedShopkeeper && user?.role === 'shopkeeper' ? [{ href: '/dashboard/shopkeeper', label: '🛒 My Shopkeeper Panel', color: '' }] : []),
        ...(isApprovedManager ? [{ href: '/dashboard/manager', label: '🏪 My Store Dashboard', color: '' }] : []),
        ...(isOwner ? [{ href: '/dashboard/owner', label: '👑 Owner Dashboard', color: '' }] : []),
        { href: '/security/two-factor', label: user?.twoFactorEnabled ? '🛡️ 2FA Settings (On)' : '🔓 Enable 2FA', color: user?.twoFactorEnabled ? '#10b981' : '' },
    ];

    return (
        <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
            <Link href="/" className="navbar-brand">
                <div className="brand-icon">⚡</div>
                <span className="text-gradient">ShopVault</span>
            </Link>

            <ul className="navbar-nav">
                {navLinks.map(l => (
                    <li key={`${l.href}-${l.label}`}>
                        <Link href={l.href} className={`nav-link${pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href + '/')) ? ' active' : ''}`}>
                            {l.label}
                        </Link>
                    </li>
                ))}
            </ul>

            <div className="navbar-actions">
                {isLoggedIn ? (
                    <div ref={dropdownRef} style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer' }} onClick={() => setDropdownOpen(!dropdownOpen)}>
                            {roleLabel && <span className={`role-badge ${user?.role}`}>{roleLabel}</span>}
                            <button className={`nav-avatar ${avatarClass}`}>
                                {user?.firstname?.[0]?.toUpperCase() || 'U'}
                            </button>
                        </div>
                        {dropdownOpen && (
                            <div style={{ position: 'absolute', top: '48px', right: 0, minWidth: '220px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', animation: 'slideInUp .2s ease both', zIndex: 300 }}>
                                <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                                    <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{user?.firstname} {user?.lastname || ''}</div>
                                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{user?.email}</div>
                                    <span className={`badge mt-2 ${user?.role === 'owner' ? 'badge-pink' : user?.role === 'manager' ? 'badge-cyan' : 'badge-primary'}`}>
                                        {user?.role?.toUpperCase()}
                                    </span>
                                </div>
                                <div style={{ padding: '.5rem' }}>
                                    {dropdownLinks.map(l => (
                                        <Link key={`${l.href}-${l.label}`} href={l.href} onClick={() => setDropdownOpen(false)}
                                            style={{ display: 'block', padding: '.6rem .75rem', borderRadius: '8px', fontSize: '.85rem', color: l.color || 'var(--text-secondary)', transition: 'background 200ms', fontWeight: l.color ? 600 : 500 }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-hover)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                            {l.label}
                                        </Link>
                                    ))}
                                    <button onClick={handleLogout}
                                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '.6rem .75rem', borderRadius: '8px', fontSize: '.85rem', color: '#f87171', fontWeight: 600, cursor: 'pointer' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,.08)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                        🚪 Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <Link href="/login" className="btn btn-secondary btn-sm">Login</Link>
                        <Link href="/register" className="btn btn-primary btn-sm">Sign Up</Link>
                    </>
                )}
                <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
                    <span style={{ transform: menuOpen ? 'rotate(45deg) translate(5px,5px)' : 'none' }} />
                    <span style={{ opacity: menuOpen ? 0 : 1 }} />
                    <span style={{ transform: menuOpen ? 'rotate(-45deg) translate(5px,-5px)' : 'none' }} />
                </button>
            </div>

            {menuOpen && (
                <div style={{ position: 'fixed', top: '68px', left: 0, right: 0, background: 'rgba(5,5,8,.98)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--glass-border)', padding: '1rem', zIndex: 99, animation: 'slideInUp .3s ease both' }}>
                    {navLinks.map(l => (
                        <Link key={`mobile-${l.href}-${l.label}`} href={l.href} className="nav-link" style={{ display: 'block', marginBottom: '.25rem', fontWeight: 600 }} onClick={() => setMenuOpen(false)}>
                            {l.label}
                        </Link>
                    ))}
                    {!isLoggedIn && (
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                            <Link href="/login" className="btn btn-secondary btn-sm" onClick={() => setMenuOpen(false)}>Login</Link>
                            <Link href="/register" className="btn btn-primary btn-sm" onClick={() => setMenuOpen(false)}>Sign Up</Link>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
}
