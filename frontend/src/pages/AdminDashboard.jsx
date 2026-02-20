import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { productService } from '../services/productService';
import toast from 'react-hot-toast';
import './Products.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await productService.getAllProducts();
      setProducts(data.products || data);
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await productService.deleteProduct(id);
      toast.success('Product deleted successfully');
      setProducts(products.filter(p => p._id !== id));
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleEditStart = (product) => {
    setEditingId(product._id);
    setEditFormData(product);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: name === 'price' || name === 'stock' ? parseFloat(value) : value
    });
  };

  const handleEditSubmit = async (id) => {
    try {
      await productService.updateProduct(id, editFormData);
      toast.success('Product updated successfully');
      setEditingId(null);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to update product');
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditFormData({});
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="products-container">
      <div className="products-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome, {user?.firstname}! Manage all products here.</p>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <h3>Total Products</h3>
          <p className="stat-number">{products.length}</p>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="no-products">No products to manage</p>
      ) : (
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Description</th>
                <th>Price</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product._id}>
                  {editingId === product._id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          name="name"
                          value={editFormData.name}
                          onChange={handleEditChange}
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          name="description"
                          value={editFormData.description}
                          onChange={handleEditChange}
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          name="price"
                          value={editFormData.price}
                          onChange={handleEditChange}
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          name="category"
                          value={editFormData.category}
                          onChange={handleEditChange}
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          name="stock"
                          value={editFormData.stock}
                          onChange={handleEditChange}
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <button
                          onClick={() => handleEditSubmit(product._id)}
                          className="btn btn-success btn-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{product.name}</td>
                      <td>{product.description}</td>
                      <td>${product.price}</td>
                      <td>{product.category}</td>
                      <td>{product.stock}</td>
                      <td>
                        <button
                          onClick={() => handleEditStart(product)}
                          className="btn btn-primary btn-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="btn btn-danger btn-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .admin-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }
        .stat-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-number {
          font-size: 32px;
          font-weight: bold;
          color: #007bff;
        }
        .admin-table {
          overflow-x: auto;
          margin-top: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border-radius: 8px;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background: #007bff;
          color: white;
          font-weight: bold;
        }
        tr:hover {
          background: #f8f9fa;
        }
        .edit-input {
          width: 100%;
          padding: 6px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
          margin-right: 5px;
        }
        .btn-success {
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-success:hover {
          background: #218838;
        }
        .btn-danger {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-danger:hover {
          background: #c82333;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
