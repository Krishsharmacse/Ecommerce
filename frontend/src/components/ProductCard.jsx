import React from 'react';
import { Link } from 'react-router-dom';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  return (
    <div className="product-card">
      {product.image && (
        <img src={product.image} alt={product.name} className="product-image" />
      )}
      <div className="product-info">
        <h3>{product.name}</h3>
        <p className="product-description">{product.description}</p>
        <p className="product-price">${product.price}</p>
        <p className="product-stock">Stock: {product.stock}</p>
        <Link to={`/product/${product._id}`} className="view-details-btn">
          View Details
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;