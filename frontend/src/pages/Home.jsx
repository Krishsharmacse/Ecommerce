import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>Welcome to ProductStore</h1>
        <p>Discover amazing products at great prices</p>
        <div className="hero-buttons">
          <Link to="/products" className="btn btn-primary">
            Browse Products
          </Link>
          <Link to="/register" className="btn btn-secondary">
            Get Started
          </Link>
        </div>
      </div>

      <div className="features-section">
        <h2>Why Choose Us?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Quality Products</h3>
            <p>We ensure the highest quality products for our customers</p>
          </div>
          <div className="feature-card">
            <h3>Best Prices</h3>
            <p>Competitive prices on all our products</p>
          </div>
          <div className="feature-card">
            <h3>Fast Delivery</h3>
            <p>Quick and reliable shipping to your doorstep</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;