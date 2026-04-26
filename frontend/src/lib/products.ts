import api from './api';

export interface Product {
    _id: string;
    name: string;
    productName?: string;
    description: string;
    price: number;
    category: string;
    stock: number;
    image?: string;
    imageType?: string;
    createdBy?: { firstname: string; email: string };
    createdAt?: string;
}

export const productService = {
    getAll: async (): Promise<Product[]> => {
        const res = await api.get('/product/all');
        return res.data.products;
    },

    getById: async (id: string): Promise<Product> => {
        const res = await api.get(`/product/${id}`);
        return res.data.product;
    },

    create: async (data: Partial<Product>): Promise<Product> => {
        const res = await api.post('/product/create', data);
        return res.data.product;
    },

    update: async (id: string, data: Partial<Product>): Promise<Product> => {
        const res = await api.put(`/product/update/${id}`, data);
        return res.data.product;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/product/delete/${id}`);
    },
};
