import api from './api';

export interface Product {
    id: string;
    _id: string;
    name: string;
    productName?: string;
    description: string;
    price: number;
    pricePaise?: number;
    category: string;
    stock: number;
    image?: string;
    images?: { url: string; altText?: string }[];
    createdAt?: string;
}

export function normalizeProduct(raw: unknown): Product {
    if (!raw || typeof raw !== 'object') {
        return {
            id: '',
            _id: '',
            name: '',
            description: '',
            price: 0,
            category: 'Curated Goods',
            stock: 0,
        };
    }
    const r = raw as Record<string, unknown>;
    const id = String(r.id || r._id || '');
    const price = typeof r.price === 'number' && r.price > 0
        ? r.price
        : (typeof r.pricePaise === 'number' ? r.pricePaise / 100 : 0);
    const catObj = r.category as { name?: string } | undefined;
    const category = typeof r.category === 'string'
        ? r.category
        : (catObj?.name || 'Curated Goods');
    const imgs = r.images as Array<{ url: string; altText?: string }> | undefined;
    const image = typeof r.image === 'string' ? r.image : (imgs?.[0]?.url || '');
    return {
        ...(r as unknown as Product),
        id,
        _id: id,
        name: String(r.name || r.productName || 'Curated Product'),
        price,
        category,
        image,
    };
}

export const productService = {
    getAll: async (): Promise<Product[]> => {
        try {
            const res = await api.get('/products');
            const items = res.data.products || [];
            return items.map(normalizeProduct);
        } catch {
            return [];
        }
    },

    getById: async (id: string): Promise<Product> => {
        const res = await api.get(`/products/${id}`);
        return normalizeProduct(res.data.product);
    },

    create: async (data: Partial<Product>): Promise<Product> => {
        const res = await api.post('/products', data);
        return normalizeProduct(res.data.product);
    },

    update: async (id: string, data: Partial<Product>): Promise<Product> => {
        const res = await api.patch(`/products/${id}`, data);
        return normalizeProduct(res.data.product);
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/products/${id}`);
    },
};
