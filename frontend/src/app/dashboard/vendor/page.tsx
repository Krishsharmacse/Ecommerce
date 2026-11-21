'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { shopService, Shop, ShopRequest } from '@/lib/shops';
import { productService, Product } from '@/lib/products';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Camera, Upload, Trash2, X } from 'lucide-react';

type Tab = 'overview' | 'products' | 'orders' | 'shop';

interface VendorOrder {
    id: string;
    customerName: string;
    customerEmail?: string;
    productName: string;
    quantity: number;
    subtotal: number;
    createdAt: string;
    status: string;
}

/* ─── Glassmorphism Vendor Portal ─── */
export default function VendorDashboardPage() {
    const { user } = useAuth();
    const [tab, setTab] = useState<Tab>('overview');
    const [shop, setShop] = useState<Shop | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<VendorOrder[]>([]);
    const [activeRequest, setActiveRequest] = useState<ShopRequest | null>(null);
    const [allRequests, setAllRequests] = useState<ShopRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [submittingDeleteReq, setSubmittingDeleteReq] = useState(false);

    const [openForm, setOpenForm] = useState({
        name: '',
        category: 'Electronics',
        description: '',
        phone: '',
        email: user?.email || '',
        address: '',
        logoUrl: '',
    });
    const [submittingOpenReq, setSubmittingOpenReq] = useState(false);

    const loadWorkspace = async () => {
        setLoading(true);
        try {
            const data = await shopService.getMyShop();
            setShop(data?.shop || null);
            setProducts(data?.products || []);
            setOrders(data?.recentOrders || []);
            setActiveRequest(data?.activeRequest || null);
            setAllRequests(data?.requests || []);
        } catch (err: unknown) {
            const e = err as { response?: { status?: number } };
            if (e?.response?.status === 404) {
                setShop(null); setProducts([]); setOrders([]);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadWorkspace(); }, []);

    const handleOpenShopSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!openForm.name.trim()) { toast.error('Store name is required'); return; }
        setSubmittingOpenReq(true);
        try {
            await shopService.requestOpenShop(openForm);
            toast.success('Shop opening request submitted!');
            await loadWorkspace();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Failed to submit request');
        } finally { setSubmittingOpenReq(false); }
    };

    const handleDeleteShopSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deleteReason.trim() || deleteReason.trim().length < 5) { toast.error('Please provide a reason (min 5 chars)'); return; }
        if (!shop?._id && !shop?.id) return;
        setSubmittingDeleteReq(true);
        try {
            await shopService.requestDeleteShop({ shopId: shop.id || shop._id, reason: deleteReason });
            toast.success('Shop deletion request submitted.');
            setShowDeleteModal(false); setDeleteReason('');
            await loadWorkspace();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Failed to submit deletion request');
        } finally { setSubmittingDeleteReq(false); }
    };

    const handleCancelRequest = async (requestId: string) => {
        if (!confirm('Cancel this pending request?')) return;
        try {
            await shopService.cancelShopRequest(requestId);
            toast.success('Request cancelled'); await loadWorkspace();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Failed to cancel');
        }
    };

    const handleDeleteProduct = async (productId: string) => {
        if (!confirm('Delete this product?')) return;
        try {
            await productService.delete(productId);
            toast.success('Product removed'); await loadWorkspace();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Failed to delete');
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 48, height: 48, border: '2px solid transparent',
                        borderTopColor: '#00f2fe', borderRightColor: '#a855f7',
                        borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px'
                    }} />
                    <p style={{ color: '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>Loading your storefront...</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const isLive = shop && shop.status === 'approved';
    const pendingOpenReq = activeRequest?.type === 'OPEN_SHOP';
    const pendingDeleteReq = activeRequest?.type === 'DELETE_SHOP';
    const lastRejectedReq = allRequests.find(r => r.status === 'REJECTED');

    const navItems = [
        { id: 'overview', icon: '📊', label: 'Overview' },
        { id: 'products', icon: '📦', label: 'Products', badge: products.length },
        { id: 'orders', icon: '🛍️', label: 'Orders', badge: orders.length },
        { id: 'shop', icon: '⚙️', label: 'Store Settings' },
    ];

    const totalRevenue = orders.reduce((s: number, o: VendorOrder) => s + (o.subtotal || 0), 0);
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 5).length;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Geist:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

                .vp-root { display: flex; min-height: 100vh; background: #0a0f1e; font-family: 'Geist', system-ui, sans-serif; position: relative; overflow: hidden; }
                .vp-root::before { content: ''; position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse 80% 50% at 20% 10%, rgba(0,242,254,0.04) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 90%, rgba(168,85,247,0.04) 0%, transparent 60%); }

                /* Sidebar */
                .vp-sidebar { width: 260px; min-height: 100vh; background: rgba(15,23,42,0.7); backdrop-filter: blur(20px); border-right: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; transition: width 0.3s ease; flex-shrink: 0; position: relative; z-index: 10; }
                .vp-sidebar.collapsed { width: 72px; }
                .vp-sidebar-brand { padding: 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
                .vp-brand-title { font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #00f2fe, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .vp-brand-sub { font-size: 11px; color: #64748b; margin-top: 2px; font-family: 'JetBrains Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .vp-status-badge { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; padding: 3px 8px; border-radius: 9999px; font-size: 10px; font-family: 'JetBrains Mono', monospace; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
                .vp-status-badge.live { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #10b981; }
                .vp-status-badge.pending { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); color: #f59e0b; }
                .vp-status-badge.setup { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; }
                .vp-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
                .vp-dot.pulse { animation: vp-pulse 2s infinite; }
                @keyframes vp-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

                .vp-nav { flex: 1; padding: 12px 8px; }
                .vp-nav-section { font-size: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.08em; color: #475569; text-transform: uppercase; padding: 8px 8px 4px; }
                .vp-nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px; cursor: pointer; transition: all 0.15s; color: #94a3b8; font-size: 13.5px; font-weight: 500; border: 1px solid transparent; position: relative; white-space: nowrap; overflow: hidden; }
                .vp-nav-item:hover { background: rgba(255,255,255,0.04); color: #f8fafc; }
                .vp-nav-item.active { background: rgba(0,242,254,0.08); border-color: rgba(0,242,254,0.2); color: #00f2fe; }
                .vp-nav-item.active .vp-nav-icon { filter: drop-shadow(0 0 6px rgba(0,242,254,0.5)); }
                .vp-nav-icon { font-size: 16px; flex-shrink: 0; }
                .vp-nav-badge { margin-left: auto; background: rgba(0,242,254,0.15); color: #00f2fe; font-size: 10px; font-family: 'JetBrains Mono', monospace; padding: 1px 6px; border-radius: 9999px; border: 1px solid rgba(0,242,254,0.25); flex-shrink: 0; }

                .vp-nav-footer { padding: 12px 8px 16px; border-top: 1px solid rgba(255,255,255,0.06); }
                .vp-collapse-btn { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); color: #64748b; font-size: 12px; cursor: pointer; transition: all 0.15s; }
                .vp-collapse-btn:hover { background: rgba(255,255,255,0.06); color: #94a3b8; }

                /* Main */
                .vp-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
                .vp-topbar { height: 60px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; background: rgba(10,15,30,0.6); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.06); gap: 12px; position: sticky; top: 0; z-index: 5; }
                .vp-search { display: flex; align-items: center; gap: 8px; background: rgba(10,15,30,0.65); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0 12px; height: 36px; flex: 1; max-width: 340px; }
                .vp-search input { background: none; border: none; outline: none; color: #f8fafc; font-size: 13px; flex: 1; }
                .vp-search input::placeholder { color: #475569; }
                .vp-topbar-right { display: flex; align-items: center; gap: 10px; }
                .vp-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #00f2fe, #a855f7); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #0a0f1e; flex-shrink: 0; }

                /* Content */
                .vp-content { flex: 1; padding: 24px; overflow-y: auto; }

                /* KPI Cards */
                .vp-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
                @media (max-width: 1200px) { .vp-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (max-width: 768px) { .vp-kpi-grid { grid-template-columns: 1fr; } }
                .vp-kpi { background: rgba(20,30,55,0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px 20px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 20px rgba(0,0,0,0.3); transition: all 0.2s; cursor: default; }
                .vp-kpi:hover { border-color: rgba(0,242,254,0.25); box-shadow: 0 0 20px -4px rgba(0,242,254,0.15), inset 0 1px 0 rgba(255,255,255,0.12); }
                .vp-kpi-label { font-size: 11px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
                .vp-kpi-value { font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em; }
                .vp-kpi-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
                .vp-kpi.cyan .vp-kpi-value { color: #00f2fe; }
                .vp-kpi.purple .vp-kpi-value { color: #a855f7; }
                .vp-kpi.green .vp-kpi-value { color: #10b981; }
                .vp-kpi.amber .vp-kpi-value { color: #f59e0b; }

                /* Section Header */
                .vp-section-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 20px; }
                .vp-section-title { font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em; }
                .vp-section-sub { font-size: 13px; color: #64748b; margin-top: 2px; }

                /* Buttons */
                .vp-btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; background: linear-gradient(135deg, #00f2fe, #06b6d4); color: #0a0f1e; font-size: 13px; font-weight: 700; border-radius: 8px; cursor: pointer; border: none; box-shadow: 0 0 16px rgba(0,242,254,0.3); transition: all 0.15s; font-family: 'Space Grotesk', sans-serif; }
                .vp-btn-primary:hover { filter: brightness(1.1); box-shadow: 0 0 24px rgba(0,242,254,0.5); transform: translateY(-1px); }
                .vp-btn-primary:active { transform: scale(0.98); }
                .vp-btn-secondary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: rgba(255,255,255,0.04); color: #f8fafc; font-size: 13px; font-weight: 500; border-radius: 8px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: all 0.15s; }
                .vp-btn-secondary:hover { background: rgba(168,85,247,0.1); border-color: rgba(168,85,247,0.4); }
                .vp-btn-danger { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: rgba(239,68,68,0.08); color: #ef4444; font-size: 12px; font-weight: 600; border-radius: 8px; cursor: pointer; border: 1px solid rgba(239,68,68,0.25); transition: all 0.15s; }
                .vp-btn-danger:hover { background: rgba(239,68,68,0.15); box-shadow: 0 0 12px rgba(239,68,68,0.2); }
                .vp-btn-sm { padding: 6px 12px; font-size: 12px; }

                /* Product Grid */
                .vp-products-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
                @media (max-width: 1200px) { .vp-products-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (max-width: 768px) { .vp-products-grid { grid-template-columns: 1fr; } }
                .vp-product-card { background: rgba(20,30,55,0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 20px rgba(0,0,0,0.3); transition: all 0.25s; display: flex; flex-direction: column; }
                .vp-product-card:hover { border-color: rgba(0,242,254,0.3); box-shadow: 0 0 24px -4px rgba(0,242,254,0.2), 0 12px 40px rgba(0,0,0,0.5); transform: translateY(-2px); }
                .vp-product-img { height: 180px; background: rgba(15,23,42,0.8); overflow: hidden; position: relative; }
                .vp-product-img img { width: 100%; height: 100%; object-fit: cover; }
                .vp-product-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 40px; }
                .vp-product-body { padding: 14px 16px; flex: 1; display: flex; flex-direction: column; }
                .vp-product-name { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 14px; color: #f8fafc; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .vp-product-price { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 600; color: #00f2fe; margin-bottom: 6px; }
                .vp-product-desc { font-size: 12px; color: #64748b; line-height: 1.5; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 10px; }
                .vp-product-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
                .vp-cat-badge { font-size: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.04em; padding: 2px 8px; border-radius: 9999px; background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.25); color: #c084fc; }
                .vp-stock-badge { font-size: 10px; font-family: 'JetBrains Mono', monospace; padding: 2px 8px; border-radius: 9999px; }
                .vp-stock-badge.ok { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: #10b981; }
                .vp-stock-badge.low { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.25); color: #f59e0b; }
                .vp-stock-badge.out { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #ef4444; }
                .vp-product-actions { display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); }

                /* Table */
                .vp-card { background: rgba(20,30,55,0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); }
                .vp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                .vp-table th { padding: 12px 16px; text-align: left; font-size: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.06em; text-transform: uppercase; color: #475569; border-bottom: 1px solid rgba(255,255,255,0.06); }
                .vp-table td { padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #b9cacb; vertical-align: middle; }
                .vp-table tr:hover td { background: rgba(255,255,255,0.02); }
                .vp-table tr:last-child td { border-bottom: none; }
                .vp-table .mono { font-family: 'JetBrains Mono', monospace; }
                .vp-table .cyan { color: #00f2fe; }

                /* FAB */
                .vp-fab { position: fixed; bottom: 28px; right: 28px; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #00f2fe, #a855f7); border: none; cursor: pointer; box-shadow: 0 0 24px rgba(0,242,254,0.4), 0 8px 24px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 22px; transition: all 0.2s; z-index: 50; }
                .vp-fab:hover { transform: scale(1.1); box-shadow: 0 0 36px rgba(0,242,254,0.6); }
                .vp-fab:active { transform: scale(0.95); }

                /* Modal */
                .vp-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
                .vp-modal { background: rgba(10,15,30,0.95); backdrop-filter: blur(28px); border: 1px solid rgba(168,85,247,0.25); border-radius: 16px; box-shadow: 0 24px 64px rgba(0,0,0,0.8); width: 100%; max-width: 560px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
                .vp-modal-accent { height: 3px; background: linear-gradient(90deg, #00f2fe, #a855f7); flex-shrink: 0; }
                .vp-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 0; }
                .vp-modal-title { font-family: 'Space Grotesk', sans-serif; font-size: 17px; font-weight: 700; color: #f8fafc; }
                .vp-modal-close { width: 30px; height: 30px; border-radius: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.15s; }
                .vp-modal-close:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #ef4444; }
                .vp-modal-body { flex: 1; overflow-y: auto; padding: 18px 22px; }
                .vp-modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }

                /* Form */
                .vp-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
                .vp-label { font-size: 12px; font-weight: 600; color: #b9cacb; font-family: 'Space Grotesk', sans-serif; }
                .vp-label span { color: #ef4444; }
                .vp-input { height: 40px; padding: 0 12px; background: rgba(10,15,30,0.65); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #f8fafc; font-size: 13.5px; outline: none; transition: all 0.15s; font-family: 'Geist', sans-serif; width: 100%; box-sizing: border-box; }
                .vp-input:focus { border-color: #00f2fe; box-shadow: 0 0 0 3px rgba(0,242,254,0.12); }
                .vp-input::placeholder { color: #475569; }
                .vp-textarea { padding: 10px 12px; background: rgba(10,15,30,0.65); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #f8fafc; font-size: 13.5px; outline: none; transition: all 0.15s; font-family: 'Geist', sans-serif; width: 100%; box-sizing: border-box; resize: vertical; min-height: 80px; line-height: 1.5; }
                .vp-textarea:focus { border-color: #00f2fe; box-shadow: 0 0 0 3px rgba(0,242,254,0.12); }
                .vp-textarea::placeholder { color: #475569; }
                .vp-select { height: 40px; padding: 0 12px; background: rgba(10,15,30,0.65); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #f8fafc; font-size: 13.5px; outline: none; transition: all 0.15s; width: 100%; box-sizing: border-box; cursor: pointer; }
                .vp-select:focus { border-color: #00f2fe; box-shadow: 0 0 0 3px rgba(0,242,254,0.12); }
                .vp-select option { background: #1a1f2f; color: #f8fafc; }
                .vp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

                /* Image Upload */
                .vp-upload-zone { border: 1.5px dashed rgba(0,242,254,0.25); border-radius: 10px; background: rgba(0,242,254,0.03); padding: 16px; margin-bottom: 14px; }
                .vp-upload-preview { width: 100%; height: 160px; border-radius: 8px; overflow: hidden; margin-bottom: 10px; background: rgba(15,23,42,0.8); display: flex; align-items: center; justify-content: center; position: relative; }
                .vp-upload-preview img { width: 100%; height: 100%; object-fit: cover; }
                .vp-upload-preview-placeholder { font-size: 36px; color: rgba(0,242,254,0.3); }
                .vp-upload-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .vp-upload-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 10px; border-radius: 10px; cursor: pointer; transition: all 0.15s; border: 1px solid rgba(255,255,255,0.08); background: rgba(20,30,55,0.5); color: #94a3b8; font-size: 12px; text-align: center; font-weight: 500; }
                .vp-upload-btn:hover { background: rgba(0,242,254,0.08); border-color: rgba(0,242,254,0.3); color: #00f2fe; }
                .vp-upload-btn .icon { font-size: 22px; }
                .vp-upload-label { font-size: 10px; color: #64748b; font-family: 'JetBrains Mono', monospace; text-align: center; margin-top: 6px; }

                /* Camera Modal */
                .vp-camera-modal { max-width: 420px; }
                .vp-camera-video { width: 100%; height: 280px; border-radius: 10px; object-fit: cover; background: #000; display: block; }
                .vp-camera-controls { display: flex; justify-content: center; gap: 16px; padding: 14px 0 4px; }
                .vp-shutter { width: 60px; height: 60px; border-radius: 50%; background: white; border: 4px solid rgba(0,242,254,0.6); cursor: pointer; transition: all 0.15s; box-shadow: 0 0 20px rgba(0,242,254,0.4); }
                .vp-shutter:hover { transform: scale(1.05); }
                .vp-shutter:active { transform: scale(0.95); }

                /* Open Shop Form styles */
                .vp-onboard-card { background: rgba(20,30,55,0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.5); max-width: 640px; margin: 0 auto; }
                .vp-info-box { background: rgba(0,242,254,0.05); border: 1px solid rgba(0,242,254,0.15); border-radius: 8px; padding: 12px 14px; display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: #94a3b8; line-height: 1.55; }
                .vp-error-box { background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; }

                /* Pending Card */
                .vp-pending-card { background: rgba(20,30,55,0.6); backdrop-filter: blur(20px); border: 1px solid rgba(245,158,11,0.2); border-radius: 16px; padding: 36px; text-align: center; max-width: 520px; margin: 0 auto; box-shadow: 0 0 40px rgba(245,158,11,0.05); }
                .vp-empty { text-align: center; padding: 48px; }
                .vp-empty-icon { font-size: 48px; margin-bottom: 12px; }
                .vp-empty-title { font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 600; color: #f8fafc; margin-bottom: 6px; }
                .vp-empty-sub { font-size: 13px; color: #64748b; margin-bottom: 16px; }

                /* Filter toolbar */
                .vp-filter-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
                .vp-filter-input { height: 36px; padding: 0 12px 0 36px; background: rgba(10,15,30,0.65); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #f8fafc; font-size: 13px; outline: none; width: 200px; font-family: 'Geist', sans-serif; }
                .vp-filter-input:focus { border-color: rgba(0,242,254,0.4); }
                .vp-filter-input::placeholder { color: #475569; }
                .vp-filter-wrap { position: relative; }
                .vp-filter-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #475569; font-size: 13px; }

                /* Shop Settings card */
                .vp-settings-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; }
                .vp-settings-row:last-child { border-bottom: none; }
                .vp-settings-row .key { color: #64748b; }
                .vp-settings-row .val { color: #f8fafc; font-weight: 500; }

                /* Status banners */
                .vp-banner-warning { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
                .vp-order-status { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 9999px; font-size: 10px; font-family: 'JetBrains Mono', monospace; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
                .vp-order-status.paid { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: #10b981; }
                .vp-order-status.pending { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.25); color: #f59e0b; }
                .vp-order-status.cancelled { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #ef4444; }

                /* Scrollbar */
                ::-webkit-scrollbar { width: 4px; height: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 9999px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(0,242,254,0.3); }
            `}</style>

            <div className="vp-root">
                {/* Sidebar */}
                <aside className={`vp-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
                    <div className="vp-sidebar-brand">
                        <div className="vp-brand-title">
                            {sidebarCollapsed ? '⚡' : `⚡ ${shop?.name || 'Vendor Hub'}`}
                        </div>
                        {!sidebarCollapsed && (
                            <>
                                <div className="vp-brand-sub">{user?.firstname} {user?.lastname}</div>
                                <div className={`vp-status-badge ${isLive ? 'live' : pendingOpenReq ? 'pending' : 'setup'}`}>
                                    <div className={`vp-dot ${isLive ? 'pulse' : ''}`} />
                                    {isLive ? 'ACTIVE STORE' : pendingOpenReq ? 'PENDING' : 'SETUP REQUIRED'}
                                </div>
                            </>
                        )}
                    </div>

                    {isLive && (
                        <nav className="vp-nav">
                            <div className="vp-nav-section">{!sidebarCollapsed && 'Management'}</div>
                            {navItems.map(item => (
                                <button
                                    key={item.id}
                                    className={`vp-nav-item${tab === item.id ? ' active' : ''}`}
                                    onClick={() => setTab(item.id as Tab)}
                                    title={sidebarCollapsed ? item.label : undefined}
                                >
                                    <span className="vp-nav-icon">{item.icon}</span>
                                    {!sidebarCollapsed && <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>}
                                    {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                                        <span className="vp-nav-badge">{item.badge}</span>
                                    )}
                                </button>
                            ))}

                            <div className="vp-nav-section" style={{ marginTop: 12 }}>{!sidebarCollapsed && 'Quick Links'}</div>
                            <Link href="/shop" className="vp-nav-item" title={sidebarCollapsed ? 'Marketplace' : undefined}>
                                <span className="vp-nav-icon">🛒</span>
                                {!sidebarCollapsed && 'Marketplace'}
                            </Link>
                        </nav>
                    )}
                    {!isLive && !sidebarCollapsed && (
                        <div className="vp-nav" style={{ padding: '12px' }}>
                            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                                {pendingOpenReq ? '⏳ Awaiting admin approval' : '📝 Apply to open your store'}
                            </div>
                        </div>
                    )}

                    <div className="vp-nav-footer">
                        <button className="vp-collapse-btn" onClick={() => setSidebarCollapsed(s => !s)}>
                            <span>{sidebarCollapsed ? '→' : '←'}</span>
                            {!sidebarCollapsed && <span style={{ fontSize: 11 }}>Collapse</span>}
                        </button>
                    </div>
                </aside>

                {/* Main Area */}
                <div className="vp-main">
                    {/* Topbar */}
                    <div className="vp-topbar">
                        <div className="vp-search">
                            <span style={{ color: '#475569', fontSize: 13 }}>🔍</span>
                            <input placeholder="Search products, orders..." />
                        </div>
                        <div className="vp-topbar-right">
                            {isLive && (
                                <button className="vp-btn-primary" style={{ fontSize: 12, padding: '7px 14px' }}
                                    onClick={() => { setEditingProduct(null); setShowProductModal(true); }}>
                                    ＋ Add Product
                                </button>
                            )}
                            <div className="vp-avatar">{(user?.firstname?.[0] || 'V').toUpperCase()}</div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="vp-content">
                        {/* ─── NOT APPROVED ─── */}
                        {!isLive && (
                            <div style={{ padding: '24px 0' }}>
                                {pendingOpenReq ? (
                                    <div className="vp-pending-card">
                                        <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 9999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: 10, fontFamily: 'JetBrains Mono', letterSpacing: '0.06em', marginBottom: 12 }}>
                                            UNDER ADMIN REVIEW
                                        </div>
                                        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>Store Application Submitted</h2>
                                        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, maxWidth: 380, margin: '0 auto 20px' }}>
                                            Your request to open <strong style={{ color: '#f8fafc' }}>{activeRequest.shopName}</strong> is being reviewed by administrators. Typically approved within 24 hours.
                                        </p>
                                        <div style={{ background: 'rgba(10,15,30,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14, textAlign: 'left', marginBottom: 20 }}>
                                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Submitted: {new Date(activeRequest.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                                            <div style={{ fontSize: 12, color: '#b9cacb' }}>Category: <strong style={{ color: '#f8fafc' }}>{activeRequest.category || 'General'}</strong></div>
                                        </div>
                                        <button className="vp-btn-secondary vp-btn-sm" onClick={() => handleCancelRequest(activeRequest.id)}>
                                            ✕ Cancel Request
                                        </button>
                                    </div>
                                ) : (
                                    <div className="vp-onboard-card">
                                        <div style={{ height: 3, background: 'linear-gradient(90deg, #00f2fe, #a855f7)' }} />
                                        <div style={{ padding: '28px 28px 24px' }}>
                                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                                <div style={{ fontSize: 44, marginBottom: 10 }}>🏪</div>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 9999, background: 'rgba(0,242,254,0.08)', border: '1px solid rgba(0,242,254,0.2)', color: '#00f2fe', fontSize: 10, fontFamily: 'JetBrains Mono', letterSpacing: '0.06em', marginBottom: 10 }}>
                                                    SELLER PORTAL ONBOARDING
                                                </div>
                                                <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>Open Your Storefront</h1>
                                                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>Complete your merchant profile. Once submitted, admins will verify and approve your store.</p>
                                            </div>

                                            {lastRejectedReq && (
                                                <div className="vp-error-box">
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>⚠️ Previous Application Declined</div>
                                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{lastRejectedReq.adminNotes || 'Your previous application was declined. Please adjust and re-apply.'}</div>
                                                </div>
                                            )}

                                            <form onSubmit={handleOpenShopSubmit}>
                                                <div className="vp-grid-2">
                                                    <div className="vp-field">
                                                        <label className="vp-label">Store Name <span>*</span></label>
                                                        <input className="vp-input" value={openForm.name} onChange={e => setOpenForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Apex Audio Labs" required />
                                                    </div>
                                                    <div className="vp-field">
                                                        <label className="vp-label">Primary Category <span>*</span></label>
                                                        <select className="vp-select" value={openForm.category} onChange={e => setOpenForm(f => ({ ...f, category: e.target.value }))} required>
                                                            {['Electronics', 'Clothing', 'Footwear', 'Home & Living', 'Gourmet Food', 'Health & Wellness', 'Books & Art', 'Sports & Outdoors', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="vp-field">
                                                    <label className="vp-label">Description <span>*</span></label>
                                                    <textarea className="vp-textarea" rows={3} value={openForm.description} onChange={e => setOpenForm(f => ({ ...f, description: e.target.value }))} placeholder="Tell customers what you sell, your brand story..." required />
                                                </div>
                                                <div className="vp-grid-2">
                                                    <div className="vp-field">
                                                        <label className="vp-label">Business Phone</label>
                                                        <input className="vp-input" value={openForm.phone} onChange={e => setOpenForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
                                                    </div>
                                                    <div className="vp-field">
                                                        <label className="vp-label">Business Email</label>
                                                        <input type="email" className="vp-input" value={openForm.email} onChange={e => setOpenForm(f => ({ ...f, email: e.target.value }))} placeholder="store@example.com" />
                                                    </div>
                                                </div>
                                                <div className="vp-field">
                                                    <label className="vp-label">Operating Address</label>
                                                    <input className="vp-input" value={openForm.address} onChange={e => setOpenForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Commerce Way, Bangalore" />
                                                </div>
                                                <div className="vp-info-box" style={{ marginBottom: 16 }}>
                                                    <span>ℹ️</span>
                                                    <div><strong style={{ color: '#00f2fe' }}>Approval Process:</strong> Your application is reviewed by admins within 24 hours. You will be notified once approved.</div>
                                                </div>
                                                <button type="submit" className="vp-btn-primary" style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: 14 }} disabled={submittingOpenReq}>
                                                    {submittingOpenReq ? '⏳ Submitting...' : '🚀 Submit Shop Opening Request'}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── APPROVED STORE ─── */}
                        {isLive && (
                            <>
                                {pendingDeleteReq && (
                                    <div className="vp-banner-warning">
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>⚠️ Store Deletion Request Pending</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Submitted on {new Date(activeRequest.createdAt).toLocaleDateString()}</div>
                                        </div>
                                        <button className="vp-btn-secondary vp-btn-sm" onClick={() => handleCancelRequest(activeRequest.id)}>Cancel Request</button>
                                    </div>
                                )}

                                {/* ── OVERVIEW ── */}
                                {tab === 'overview' && (
                                    <div>
                                        <div className="vp-section-header">
                                            <div>
                                                <div className="vp-section-title">{shop?.name}</div>
                                                <div className="vp-section-sub">Storefront performance overview</div>
                                            </div>
                                            <button className="vp-btn-primary" onClick={() => { setEditingProduct(null); setShowProductModal(true); }}>
                                                ＋ Add Product
                                            </button>
                                        </div>
                                        <div className="vp-kpi-grid">
                                            <div className="vp-kpi cyan">
                                                <div className="vp-kpi-label">Total Revenue</div>
                                                <div className="vp-kpi-value">₹{(shop.totalRevenue || totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                <div className="vp-kpi-sub">Cumulative store sales</div>
                                            </div>
                                            <div className="vp-kpi green">
                                                <div className="vp-kpi-label">Products Listed</div>
                                                <div className="vp-kpi-value">{products.length}</div>
                                                <div className="vp-kpi-sub">Live in catalog</div>
                                            </div>
                                            <div className="vp-kpi purple">
                                                <div className="vp-kpi-label">Total Orders</div>
                                                <div className="vp-kpi-value">{orders.length}</div>
                                                <div className="vp-kpi-sub">Customer checkouts</div>
                                            </div>
                                            <div className={`vp-kpi ${lowStockCount > 0 ? 'amber' : 'green'}`}>
                                                <div className="vp-kpi-label">Low Stock Alerts</div>
                                                <div className="vp-kpi-value">{lowStockCount}</div>
                                                <div className="vp-kpi-sub">Items needing restock</div>
                                            </div>
                                        </div>

                                        <div className="vp-card" style={{ padding: 0 }}>
                                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                <div style={{ fontFamily: 'Space Grotesk', fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Recent Orders</div>
                                            </div>
                                            {orders.length === 0 ? (
                                                <div className="vp-empty">
                                                    <div className="vp-empty-icon">🛒</div>
                                                    <div className="vp-empty-title">No orders yet</div>
                                                    <div className="vp-empty-sub">Your products are live — first orders incoming!</div>
                                                </div>
                                            ) : (
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table className="vp-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Order ID</th><th>Customer</th><th>Product</th><th>Qty</th><th>Amount</th><th>Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {orders.slice(0, 5).map((o: VendorOrder) => (
                                                                <tr key={o.id}>
                                                                    <td className="mono cyan">{o.id?.slice(0, 8)}...</td>
                                                                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>{o.customerName}</td>
                                                                    <td>{o.productName}</td>
                                                                    <td>{o.quantity}</td>
                                                                    <td className="mono" style={{ color: '#10b981' }}>₹{o.subtotal?.toFixed(2)}</td>
                                                                    <td><span className={`vp-order-status ${o.status?.toLowerCase() === 'paid' ? 'paid' : o.status?.toLowerCase().includes('cancel') ? 'cancelled' : 'pending'}`}>{o.status}</span></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ── PRODUCTS ── */}
                                {tab === 'products' && (
                                    <div>
                                        <div className="vp-section-header">
                                            <div>
                                                <div className="vp-section-title">Product Inventory</div>
                                                <div className="vp-section-sub">Manage pricing, stock levels, and product descriptions</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <button className="vp-btn-secondary" style={{ fontSize: 12, padding: '7px 14px' }}>Export ↓</button>
                                                <button className="vp-btn-primary" onClick={() => { setEditingProduct(null); setShowProductModal(true); }}>＋ Add Product</button>
                                            </div>
                                        </div>
                                        <div className="vp-filter-bar">
                                            <div className="vp-filter-wrap">
                                                <span className="vp-filter-icon">🔍</span>
                                                <input className="vp-filter-input" placeholder="Search products..." />
                                            </div>
                                            <select className="vp-select" style={{ width: 140, height: 36, fontSize: 12 }}>
                                                <option>All Categories</option>
                                                {['Electronics', 'Clothing', 'Footwear', 'Home & Living', 'Gourmet Food', 'Health & Wellness', 'Books & Art', 'Sports & Outdoors', 'Other'].map(c => <option key={c}>{c}</option>)}
                                            </select>
                                            <select className="vp-select" style={{ width: 130, height: 36, fontSize: 12 }}>
                                                <option>All Stock</option>
                                                <option>In Stock</option>
                                                <option>Low Stock</option>
                                                <option>Out of Stock</option>
                                            </select>
                                        </div>
                                        {products.length === 0 ? (
                                            <div className="vp-card">
                                                <div className="vp-empty">
                                                    <div className="vp-empty-icon">📦</div>
                                                    <div className="vp-empty-title">No products in catalog</div>
                                                    <div className="vp-empty-sub">Add your first product to start selling on ShopVault</div>
                                                    <button className="vp-btn-primary" onClick={() => { setEditingProduct(null); setShowProductModal(true); }}>＋ Add First Product</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="vp-products-grid">
                                                {products.map(p => {
                                                    const stockStatus = p.stock === 0 ? 'out' : p.stock <= 5 ? 'low' : 'ok';
                                                    const stockLabel = p.stock === 0 ? `Out of Stock` : p.stock <= 5 ? `Low Stock (${p.stock})` : `In Stock (${p.stock})`;
                                                    return (
                                                        <div key={p.id || p._id} className="vp-product-card">
                                                            <div className="vp-product-img">
                                                                {p.image ? <img src={p.image} alt={p.name} /> : <div className="vp-product-img-placeholder">📦</div>}
                                                            </div>
                                                            <div className="vp-product-body">
                                                                <div className="vp-product-name">{p.name}</div>
                                                                <div className="vp-product-price">₹{p.price?.toFixed(2)}</div>
                                                                <div className="vp-product-desc">{p.description}</div>
                                                                <div className="vp-product-meta">
                                                                    <span className="vp-cat-badge">{p.category}</span>
                                                                    <span className={`vp-stock-badge ${stockStatus}`}>{stockLabel}</span>
                                                                </div>
                                                                <div className="vp-product-actions">
                                                                    <button className="vp-btn-secondary vp-btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                                                                        onClick={() => { setEditingProduct(p); setShowProductModal(true); }}>
                                                                        ✏️ Edit
                                                                    </button>
                                                                    <button className="vp-btn-danger" style={{ padding: '6px 12px' }}
                                                                        onClick={() => handleDeleteProduct(p.id || p._id)}>
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── ORDERS ── */}
                                {tab === 'orders' && (
                                    <div>
                                        <div className="vp-section-header">
                                            <div>
                                                <div className="vp-section-title">Store Orders</div>
                                                <div className="vp-section-sub">Live fulfillment tracking for all customer purchases</div>
                                            </div>
                                        </div>
                                        <div className="vp-card" style={{ padding: 0 }}>
                                            {orders.length === 0 ? (
                                                <div className="vp-empty">
                                                    <div className="vp-empty-icon">🛍️</div>
                                                    <div className="vp-empty-title">No orders received yet</div>
                                                    <div className="vp-empty-sub">Your products are listed and live on the marketplace!</div>
                                                </div>
                                            ) : (
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table className="vp-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Order ID</th><th>Customer</th><th>Email</th><th>Product</th><th>Qty</th><th>Subtotal</th><th>Date</th><th>Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {orders.map((o: VendorOrder) => (
                                                                <tr key={o.id}>
                                                                    <td className="mono cyan">{o.id?.slice(0, 8)}...</td>
                                                                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>{o.customerName}</td>
                                                                    <td style={{ color: '#64748b' }}>{o.customerEmail}</td>
                                                                    <td style={{ fontWeight: 500, color: '#f8fafc' }}>{o.productName}</td>
                                                                    <td>{o.quantity}</td>
                                                                    <td className="mono" style={{ color: '#10b981' }}>₹{o.subtotal?.toFixed(2)}</td>
                                                                    <td style={{ color: '#64748b' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                                                                    <td><span className={`vp-order-status ${o.status?.toLowerCase() === 'paid' ? 'paid' : o.status?.toLowerCase().includes('cancel') ? 'cancelled' : 'pending'}`}>{o.status}</span></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ── SHOP SETTINGS ── */}
                                {tab === 'shop' && (
                                    <div style={{ maxWidth: 680 }}>
                                        <div className="vp-section-header" style={{ marginBottom: 20 }}>
                                            <div>
                                                <div className="vp-section-title">Store Settings</div>
                                                <div className="vp-section-sub">Manage your storefront profile and configuration</div>
                                            </div>
                                        </div>
                                        <div className="vp-card" style={{ padding: '18px 22px', marginBottom: 16 }}>
                                            <div style={{ fontFamily: 'Space Grotesk', fontSize: 15, fontWeight: 700, color: '#f8fafc', marginBottom: 14 }}>Storefront Details</div>
                                            <div className="vp-settings-row"><span className="key">Store Name</span><span className="val">{shop.name}</span></div>
                                            <div className="vp-settings-row"><span className="key">URL Slug</span><span className="val mono" style={{ color: '#00f2fe' }}>/shop/{shop.slug}</span></div>
                                            <div className="vp-settings-row"><span className="key">Category</span><span className="val">{shop.category || 'General'}</span></div>
                                            <div className="vp-settings-row"><span className="key">Status</span><span className="vp-status-badge live" style={{ fontSize: 10 }}>APPROVED & LIVE</span></div>
                                        </div>
                                        <div className="vp-card" style={{ padding: '18px 22px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.03)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                <span style={{ fontSize: 18 }}>⚠️</span>
                                                <div style={{ fontFamily: 'Space Grotesk', fontSize: 15, fontWeight: 700, color: '#ef4444' }}>Danger Zone</div>
                                            </div>
                                            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginBottom: 14 }}>
                                                Vendors cannot immediately close an active store. Submit a formal deletion request that will be reviewed by platform administrators within 48 hours.
                                            </p>
                                            {pendingDeleteReq ? (
                                                <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 12, color: '#f59e0b' }}>
                                                    ⏳ <strong>Deletion Request Pending</strong> — Awaiting admin review.
                                                </div>
                                            ) : (
                                                <button className="vp-btn-danger" onClick={() => setShowDeleteModal(true)}>
                                                    🗑️ Request Shop Deletion
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* FAB */}
                {isLive && (
                    <button className="vp-fab" onClick={() => { setEditingProduct(null); setShowProductModal(true); }} title="Quick Add Product">
                        ＋
                    </button>
                )}

                {/* Product Modal */}
                {showProductModal && (
                    <ProductModal
                        product={editingProduct}
                        onClose={() => setShowProductModal(false)}
                        onSave={() => { setShowProductModal(false); loadWorkspace(); }}
                    />
                )}

                {/* Delete Modal */}
                {showDeleteModal && (
                    <div className="vp-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}>
                        <div className="vp-modal" style={{ maxWidth: 440 }}>
                            <div className="vp-modal-accent" style={{ background: 'linear-gradient(90deg, #ef4444, #f97316)' }} />
                            <div className="vp-modal-header">
                                <h2 className="vp-modal-title" style={{ color: '#ef4444' }}>⚠️ Request Shop Deletion</h2>
                                <button className="vp-modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
                            </div>
                            <form onSubmit={handleDeleteShopSubmit}>
                                <div className="vp-modal-body">
                                    <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 14 }}>
                                        Submitting this request will alert administrators to archive <strong style={{ color: '#f8fafc' }}>{shop?.name}</strong>. Products will be unpublished upon admin approval.
                                    </p>
                                    <div className="vp-field">
                                        <label className="vp-label">Reason for closure <span>*</span></label>
                                        <textarea className="vp-textarea" style={{ borderColor: 'rgba(239,68,68,0.2)' }} rows={3} value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="e.g. Closing business operations, rebranding..." required />
                                    </div>
                                </div>
                                <div className="vp-modal-footer">
                                    <button type="button" className="vp-btn-secondary vp-btn-sm" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                                    <button type="submit" className="vp-btn-danger" disabled={submittingDeleteReq}>{submittingDeleteReq ? 'Submitting...' : 'Submit Deletion Request'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

/* ═══════════════════════════════════════════════════════════
   PRODUCT MODAL — with Camera & File Upload
═══════════════════════════════════════════════════════════ */
function ProductModal({ product, onClose, onSave }: { product: Product | null; onClose: () => void; onSave: () => void }) {
    const isEdit = !!product;
    const [form, setForm] = useState({
        name: product?.name || '',
        description: product?.description || '',
        price: product?.price ? String(product.price) : '',
        stock: product?.stock ? String(product.stock) : '10',
        category: product?.category || 'Electronics',
        imageUrl: product?.image || '',
    });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>(product?.image || '');

    // Camera
    const [showCamera, setShowCamera] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Upload file (from device or camera capture)
    const uploadFile = useCallback(async (file: File) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await api.post('/uploads/images', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const url: string = res.data?.file?.url || res.data?.url || '';
            if (!url) throw new Error('No URL returned');
            setPreviewUrl(url);
            setForm(f => ({ ...f, imageUrl: url }));
            toast.success('Image uploaded!');
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    }, []);

    // File picker
    const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Local preview immediately
        setPreviewUrl(URL.createObjectURL(file));
        uploadFile(file);
    };

    // Camera open
    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
            setCameraStream(stream);
            setShowCamera(true);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            }, 100);
        } catch {
            // Fallback to user-facing camera
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setCameraStream(stream);
                setShowCamera(true);
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.play();
                    }
                }, 100);
            } catch {
                toast.error('Camera access denied or not available');
            }
        }
    };

    const closeCamera = useCallback(() => {
        cameraStream?.getTracks().forEach(t => t.stop());
        setCameraStream(null);
        setShowCamera(false);
    }, [cameraStream]);

    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(blob => {
            if (!blob) return;
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setPreviewUrl(URL.createObjectURL(blob));
            closeCamera();
            uploadFile(file);
        }, 'image/jpeg', 0.9);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.description.trim() || !form.price) {
            toast.error('Please fill in all required fields');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                name: form.name,
                description: form.description,
                price: Number(form.price),
                stock: Number(form.stock) || 0,
                category: form.category,
                imageUrl: form.imageUrl || undefined,
            };
            if (isEdit && (product?.id || product?._id)) {
                await productService.update(product.id || product._id, payload);
                toast.success('Product updated!');
            } else {
                await productService.create(payload);
                toast.success('Product added to catalog!');
            }
            onSave();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Failed to save product');
        } finally { setLoading(false); }
    };

    useEffect(() => () => { cameraStream?.getTracks().forEach(t => t.stop()); }, [cameraStream]);

    return (
        <>
            <div className="vp-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) { closeCamera(); onClose(); } }}>
                <div className="vp-modal">
                    <div className="vp-modal-accent" />
                    <div className="vp-modal-header">
                        <h2 className="vp-modal-title">{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
                        <button className="vp-modal-close" onClick={() => { closeCamera(); onClose(); }} aria-label="Close modal">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        <div className="vp-modal-body">
                            {/* ── Image Upload Section ── */}
                            <div className="vp-upload-zone">
                                <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', marginBottom: 10 }}>
                                    Product Image
                                </div>
                                {/* Preview */}
                                <div className="vp-upload-preview">
                                    {uploading ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 32, height: 32, border: '2px solid rgba(0,242,254,0.2)', borderTopColor: '#00f2fe', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                            <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>Uploading...</span>
                                        </div>
                                    ) : previewUrl ? (
                                        <img src={previewUrl} alt="Product preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPreviewUrl('')} />
                                    ) : (
                                        <div className="vp-upload-preview-placeholder">
                                            <Camera className="w-8 h-8 text-slate-500 stroke-[1.2]" />
                                        </div>
                                    )}
                                </div>

                                {/* Upload Buttons (Camera + Device) */}
                                <div className="vp-upload-btns">
                                    <button type="button" className="vp-upload-btn" onClick={openCamera}>
                                        <span className="icon"><Camera className="w-4 h-4 text-cyan-400" /></span>
                                        <span>Take Photo</span>
                                        <span style={{ fontSize: 10, color: '#475569' }}>Use device camera</span>
                                    </button>
                                    <button type="button" className="vp-upload-btn" onClick={() => fileInputRef.current?.click()}>
                                        <span className="icon"><Upload className="w-4 h-4 text-purple-400" /></span>
                                        <span>Upload File</span>
                                        <span style={{ fontSize: 10, color: '#475569' }}>JPG, PNG, WebP</span>
                                    </button>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    style={{ display: 'none' }}
                                    onChange={handleFilePick}
                                />
                                {previewUrl && (
                                    <button type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                        onClick={() => { setPreviewUrl(''); setForm(f => ({ ...f, imageUrl: '' })); }}>
                                        <Trash2 className="w-3 h-3" /> Remove image
                                    </button>
                                )}
                            </div>

                            {/* ── Form Fields ── */}
                            <div className="vp-field">
                                <label className="vp-label">Product Name <span>*</span></label>
                                <input className="vp-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Wireless Noise-Cancelling Headphones" required />
                            </div>
                            <div className="vp-field">
                                <label className="vp-label">Description <span>*</span></label>
                                <textarea className="vp-textarea" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Key specs, materials, and highlights..." required />
                            </div>
                            <div className="vp-grid-2">
                                <div className="vp-field">
                                    <label className="vp-label">Price (₹) <span>*</span></label>
                                    <input className="vp-input" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="4999.00" required />
                                </div>
                                <div className="vp-field">
                                    <label className="vp-label">Stock Quantity <span>*</span></label>
                                    <input className="vp-input" type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="25" required />
                                </div>
                            </div>
                            <div className="vp-field">
                                <label className="vp-label">Category <span>*</span></label>
                                <select className="vp-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required>
                                    {['Electronics', 'Clothing', 'Footwear', 'Home & Living', 'Gourmet Food', 'Health & Wellness', 'Books & Art', 'Sports & Outdoors', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="vp-modal-footer">
                            <button type="button" className="vp-btn-secondary vp-btn-sm" onClick={() => { closeCamera(); onClose(); }}>Cancel</button>
                            <button type="submit" className="vp-btn-primary vp-btn-sm" disabled={loading || uploading}>
                                {loading ? 'Saving...' : uploading ? 'Uploading...' : isEdit ? 'Update Product' : 'Add to Catalog'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* ── Camera Capture Modal ── */}
            {showCamera && (
                <div className="vp-modal-backdrop" style={{ zIndex: 200 }} onClick={e => { if (e.target === e.currentTarget) closeCamera(); }}>
                    <div className="vp-modal vp-camera-modal">
                        <div className="vp-modal-accent" style={{ background: 'linear-gradient(90deg, #a855f7, #00f2fe)' }} />
                        <div className="vp-modal-header">
                            <h2 className="vp-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Camera className="w-4 h-4 text-cyan-400" /> Live Camera Capture
                            </h2>
                            <button className="vp-modal-close" onClick={closeCamera} aria-label="Close camera">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="vp-modal-body">
                            <video ref={videoRef} className="vp-camera-video" autoPlay playsInline muted />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                            <div className="vp-camera-controls">
                                <button type="button" className="vp-btn-secondary vp-btn-sm" onClick={closeCamera}>Cancel</button>
                                <button type="button" className="vp-shutter" onClick={capturePhoto} title="Capture Photo" />
                                <button type="button" className="vp-btn-secondary vp-btn-sm" onClick={capturePhoto}>Capture</button>
                            </div>
                            <p style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginTop: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                                Click the shutter button or &quot;Capture&quot; to take the photo
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
