import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productService } from '../services/productService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './ProductDetails.css';

const ProductDetails = () => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const fetchProduct = useCallback(async () => {
    try {
      const data = await productService.getProductById(id);
      setProduct(data.product || data);
    } catch (error) {
      toast.error('Failed to fetch product details');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.deleteProduct(id);
        toast.success('Product deleted successfully');
        navigate('/products');
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!product) {
    return <div className="loading">Product not found</div>;
  }

  return (
    <div className="product-details-container">
      <div className="product-details">
        {product.image && (
          <img src={product.image} alt={product.name || product.productName} className="product-details-image" />
        )}
        <div className="product-details-info">
          <h1>{product.name || product.productName}</h1>
          <p className="product-details-category">Category: {product.category}</p>
          <p className="product-details-description">{product.description}</p>
          <p className="product-details-price">Price: ${product.price}</p>
          <p className="product-details-stock">Stock: {product.stock} units</p>
          
          {isAuthenticated && (
            <div className="product-details-actions">
              <button 
                onClick={() => navigate(`/edit-product/${id}`)}
                className="edit-btn"
              >
                Edit Product
              </button>
              <button 
                onClick={handleDelete}
                className="delete-btn"
              >
                Delete Product
              </button>
            </div>
          )}
          
          <button 
            onClick={() => navigate('/products')}
            className="back-btn"
          >
            Back to Products
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;