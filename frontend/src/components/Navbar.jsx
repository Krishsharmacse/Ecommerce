import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Debug: Log user role
  console.log('Navbar user:', user, 'Role:', user?.role);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          ProductStore
        </Link>

        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className="nav-link">
              Home
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/products" className="nav-link">
              Products
            </Link>
          </li>
          
          {isAuthenticated ? (
            <>
              {user?.role === 'admin' && (
                <li className="nav-item">
                  <Link to="/add-product" className="nav-link">
                    Add Product
                  </Link>
                </li>
              )}
              {user?.role === 'admin' && (
                <li className="nav-item">
                  <Link to="/admin" className="nav-link" style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
                    Admin Dashboard
                  </Link>
                </li>
              )}
              <li className="nav-item">
                <span className="nav-user">Welcome, {user?.firstname || user?.name}</span>
              </li>
              <li className="nav-item">
                <button onClick={handleLogout} className="nav-logout-btn">
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link">Login</Link>
              </li>
              <li className="nav-item">
                <Link to="/register" className="nav-link">Register</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;