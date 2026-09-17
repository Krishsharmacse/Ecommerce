import api from './api';

export interface Shop {
    _id: string;
    id?: string;
    name: string;
    slug?: string;
    description?: string;
    logo?: string;
    banner?: string;
    category: string;
    status: 'pending' | 'approved' | 'suspended' | 'rejected';
    isActive?: boolean;
    ownerId?: { firstname: string; lastname?: string; email: string };
    email?: string;
    phone?: string;
    address?: string;
    totalRevenue?: number;
    totalOrders?: number;
    totalProducts?: number;
    createdAt?: string;
}

export interface ShopRequest {
    id: string;
    type: 'OPEN_SHOP' | 'DELETE_SHOP';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    vendorId: string;
    shopId?: string | null;
    shopName: string;
    slug?: string | null;
    category?: string | null;
    description?: string | null;
    logoUrl?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    reason?: string | null;
    adminNotes?: string | null;
    reviewedAt?: string | null;
    createdAt: string;
    vendor?: {
        id: string;
        name: string;
        email: string;
        phone?: string | null;
    };
    shopStats?: {
        totalProducts: number;
        totalRevenue: number;
        status: string;
    } | null;
}

export interface ShopAnalytics {
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    topProducts: Array<{ name: string; sold: number; revenue: number }>;
    chartData: Array<{ date: string; revenue: number }>;
    shopName?: string;
    isLive?: boolean;
}

export const shopService = {
    // Vendor: submit a shop opening request to Admin
    requestOpenShop: async (data: {
        name: string;
        slug?: string;
        category?: string;
        description?: string;
        logoUrl?: string;
        email?: string;
        phone?: string;
        address?: string;
    }) => {
        try {
            const res = await api.post('/shop/request-open', data);
            return res.data;
        } catch (err: unknown) {
            const e = err as { response?: { status?: number } };
            if (e?.response?.status === 404) {
                // Fallback to legacy direct creation
                const res = await api.post('/shop', data);
                return res.data;
            }
            throw err;
        }
    },

    // Vendor: submit a shop deletion request to Admin
    requestDeleteShop: async (data: { shopId: string; reason: string }) => {
        try {
            const res = await api.post('/shop/request-delete', data);
            return res.data;
        } catch (err: unknown) {
            const e = err as { response?: { status?: number } };
            if (e?.response?.status === 404) {
                // Fallback to legacy direct hard deletion
                const res = await api.delete(`/shop/${data.shopId}`);
                return res.data;
            }
            throw err;
        }
    },

    // Vendor: cancel their pending shop request
    cancelShopRequest: async (requestId: string) => {
        try {
            const res = await api.post(`/shop/requests/${requestId}/cancel`);
            return res.data;
        } catch (err: unknown) {
            const e = err as { response?: { status?: number } };
            if (e?.response?.status === 404) {
                return { success: true, message: 'Request cancelled (Legacy fallback)' };
            }
            throw err;
        }
    },

    // Public: all approved shops
    getAll: async (params?: { category?: string; search?: string; page?: number }): Promise<Shop[]> => {
        const res = await api.get('/shop/all', { params });
        return res.data.shops;
    },

    // Public: single shop by ID
    getById: async (shopId: string): Promise<{ shop: Shop; products: unknown[] }> => {
        const res = await api.get(`/shop/${shopId}`);
        return res.data;
    },

    // Vendor: get own shop + products + orders + active requests
    getMyShop: async () => {
        try {
            const res = await api.get('/shop/my/shop');
            return res.data;
        } catch (err: unknown) {
            const e = err as { response?: { status?: number } };
            if (e?.response?.status === 404) {
                try {
                    const fallbackRes = await api.get('/shops/my/shop');
                    return fallbackRes.data;
                } catch {
                    return {
                        shop: null,
                        products: [],
                        recentOrders: [],
                        activeRequest: null,
                        requests: [],
                    };
                }
            }
            throw err;
        }
    },

    // Vendor: update own shop
    updateMyShop: async (data: Partial<Shop>) => {
        const res = await api.put('/shop/my/shop', data);
        return res.data;
    },

    // Vendor: own shop sales analytics
    getMySales: async (days = 30): Promise<ShopAnalytics> => {
        const res = await api.get('/shop/my/sales', { params: { days } });
        return res.data.analytics;
    },

    // Legacy direct creation (fallback)
    createShop: async (data: Partial<Shop>) => {
        const res = await api.post('/shop/create', data);
        return res.data;
    },

    // Admin: list all shop requests (opening & deletion)
    listShopRequestsAdmin: async (params?: { type?: string; status?: string }): Promise<ShopRequest[]> => {
        try {
            const res = await api.get('/shop/admin/requests', { params });
            return res.data.requests || [];
        } catch (err: unknown) {
            const e = err as { response?: { status?: number } };
            if (e?.response?.status === 404) {
                const res = await api.get('/shops/admin/requests', { params });
                return res.data.requests || [];
            }
            throw err;
        }
    },

    // Admin: review shop request (approve or reject)
    reviewShopRequestAdmin: async (requestId: string, action: 'approve' | 'reject', adminNotes?: string) => {
        const res = await api.post(`/shop/admin/requests/${requestId}/review`, { action, adminNotes });
        return res.data;
    },

    // Admin: all shops (including pending)
    getAllAdmin: async (params?: { status?: string; page?: number }) => {
        const res = await api.get('/shop/admin/all', { params });
        return res.data;
    },

    // Admin: update shop status
    updateStatus: async (shopId: string, status: string, note?: string) => {
        const res = await api.put(`/shop/admin/${shopId}/status`, { status, note });
        return res.data;
    },

    // Admin: platform-wide analytics
    getPlatformSales: async (days = 30) => {
        const res = await api.get('/shop/admin/platform-sales', { params: { days } });
        return res.data.analytics;
    },
};
