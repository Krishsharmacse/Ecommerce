import api from './api';

export const productService = {
  async getAllProducts() {
    const response = await api.get('/product/all');
    return response.data.products ? response.data : { products: response.data };
  },

  async getProductById(id) {
    const response = await api.get(`/product/${id}`);
    return response.data.product || response.data;
  },

  async createProduct(productData) {
    const response = await api.post('/product/create', productData);
    return response.data.product || response.data;
  },

  async updateProduct(id, productData) {
    const response = await api.put(`/product/update/${id}`, productData);
    return response.data.product || response.data;
  },

  async deleteProduct(id) {
    const response = await api.delete(`/product/delete/${id}`);
    return response.data;
  }
};