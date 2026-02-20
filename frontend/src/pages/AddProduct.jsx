import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../services/productService';
import toast from 'react-hot-toast';
import './ProductForm.css';

const AddProduct = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    image: ''
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          image: reader.result
        });
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrl = (e) => {
    const url = e.target.value;
    setFormData({
      ...formData,
      image: url
    });
    if (url) {
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        name: formData.name,
        productName: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        category: formData.category,
        image: formData.image
      };

      await productService.createProduct(productData);
      toast.success('Product added successfully!');
      navigate('/products');
    } catch (error) {
      console.error('Product creation error:', error);
      toast.error(error.response?.data?.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-form-container">
      <h2>Add New Product</h2>
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label>Product Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter product name"
            required
          />
        </div>

        <div className="form-group">
          <label>Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter product description"
            required
            rows="4"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Price ($) *</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label>Stock *</label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              min="0"
              placeholder="0"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Category *</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="e.g., Electronics, Clothing"
            required
          />
        </div>

        <div className="form-group">
          <label>Product Image</label>
          <div className="image-input-section">
            <div className="image-input-tabs">
              <label className="tab-label">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file-input"
                />
                📤 Upload from Device
              </label>
              
              <span className="separator">OR</span>
              
              <input
                type="url"
                name="imageUrl"
                placeholder="https://example.com/image.jpg"
                onChange={handleImageUrl}
                className="url-input"
              />
            </div>

            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setFormData({ ...formData, image: '' });
                  }}
                  className="remove-image-btn"
                >
                  ✕ Remove Image
                </button>
              </div>
            )}
          </div>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Adding Product...' : 'Add Product'}
        </button>
      </form>
    </div>
  );
};

export default AddProduct;