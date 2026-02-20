import api from './api';

export const authService = {
  async register(userData) {
    try {
      const response = await api.post('/user/register', userData);
      console.log('Registration response:', response.data);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Registration service error:', error);
      throw error;
    }
  },

  async login(credentials) {
    try {
      const response = await api.post('/user/login', credentials);
      console.log('Login response:', response.data);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Login service error:', error);
      throw error;
    }
  },

  async makeAdmin(email) {
    try {
      const response = await api.post('/user/make-admin', { email });
      return response.data;
    } catch (error) {
      console.error('Make admin error:', error);
      throw error;
    }
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  }
};