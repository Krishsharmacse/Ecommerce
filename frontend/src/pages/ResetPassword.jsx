import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import './Auth.css';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { token } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!newPassword || !confirmPassword) {
      toast.error('Both password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!token) {
      toast.error('Invalid reset link');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/user/reset-password', {
        token,
        newPassword,
        confirmPassword
      });

      console.log('Reset password response:', response.data);

      if (response.data.success) {
        toast.success('Password reset successfully!');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toast.error(response.data.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to reset password';
      toast.error(errorMessage);
      
      // If token is invalid/expired, redirect to forgot password
      if (error.response?.status === 400 && 
          errorMessage.includes('Invalid') || errorMessage.includes('expired')) {
        setTimeout(() => {
          navigate('/forgot-password');
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset Password</h2>
        <p className="auth-subtitle">
          Enter your new password below
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password</label>
            <div className="password-input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input"
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <small>Password must be at least 6 characters</small>
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <div className="password-input-group">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-links">
          <p>
            Remember your password?{' '}
            <Link to="/login" className="auth-link">
              Login here
            </Link>
          </p>
          <p>
            Didn't receive reset link?{' '}
            <Link to="/forgot-password" className="auth-link">
              Request again
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
