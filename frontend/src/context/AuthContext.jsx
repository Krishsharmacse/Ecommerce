import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = authService.getCurrentUser();
    console.log('Current user from storage:', user);
    setUser(user);
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    console.log('Login response user:', response.user);
    console.log('User role:', response.user?.role);
    // Ensure user object includes all fields from server
    const userWithRole = {
      ...response.user,
      role: response.user?.role || 'user'
    };
    console.log('Setting user with role:', userWithRole);
    setUser(userWithRole);
    return response;
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    console.log('Register response user:', response.user);
    // Ensure user object includes all fields from server
    const userWithRole = {
      ...response.user,
      role: response.user?.role || 'user'
    };
    setUser(userWithRole);
    return response;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: authService.isAuthenticated(),
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
