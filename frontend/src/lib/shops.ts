import api from './api';

export interface Shop {
    _id: string;
    name: string;
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
    // Manager: create a new shop
    createShop: async (data: Partial<Shop>) => {
        const res = await api.post('/shop/create', data);
        return res.data;
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

    // Manager/Shopkeeper: get own shop + products + orders
    getMyShop: async () => {
        const res = await api.get('/shop/my/shop');
        return res.data;
    },

    // Manager: update own shop
    updateMyShop: async (data: Partial<Shop>) => {
        const res = await api.put('/shop/my/shop', data);
        return res.data;
    },

    // Manager: own shop sales analytics
    getMySales: async (days = 30): Promise<ShopAnalytics> => {
        const res = await api.get('/shop/my/sales', { params: { days } });
        return res.data.analytics;
    },

    // Manager: list shopkeepers in their shop
    getMyShopkeepers: async () => {
        const res = await api.get('/shop/my/shopkeepers');
        return res.data;
    },

    // Manager: approve/remove a shopkeeper
    assignShopkeeper: async (userId: string, action: 'approve' | 'remove') => {
        const res = await api.post('/shop/my/shopkeepers', { userId, action });
        return res.data;
    },

    // Shopkeeper: get their assigned shop
    getMyAssignedShop: async () => {
        const res = await api.get('/shop/sk/shop');
        return res.data;
    },

    // Shopkeeper: toggle shop live/offline
    toggleShopLive: async () => {
        const res = await api.patch('/shop/sk/toggle-live');
        return res.data;
    },

    // Shopkeeper: view sales analytics
    getMyAssignedShopSales: async (days = 30): Promise<ShopAnalytics> => {
        const res = await api.get('/shop/sk/sales', { params: { days } });
        return res.data.analytics;
    },

    // Shopkeeper: request to open a new shop
    requestShop: async (data: Partial<Shop>) => {
        const res = await api.post('/shop/sk/request', data);
        return res.data;
    },

    // Owner: all shops (including pending)
    getAllAdmin: async (params?: { status?: string; page?: number }) => {
        const res = await api.get('/shop/admin/all', { params });
        return res.data;
    },

    // Owner: approve/suspend/reject shop
    updateStatus: async (shopId: string, status: string, note?: string) => {
        const res = await api.put(`/shop/admin/${shopId}/status`, { status, note });
        return res.data;
    },

    // Owner: platform-wide analytics
    getPlatformSales: async (days = 30) => {
        const res = await api.get('/shop/admin/platform-sales', { params: { days } });
        return res.data.analytics;
    },
};
