import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/user/forgot-password', { email });
      console.log('Forgot password response:', response.data);
      
      if (response.data.success) {
        toast.success(response.data.message);
        setSubmitted(true);
        setEmail('');
        
        // Redirect to login after 5 seconds
        setTimeout(() => {
          navigate('/login');
        }, 5000);
      } else {
        toast.error(response.data.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send reset email';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Forgot Password</h2>

        {submitted ? (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h3>Request Sent!</h3>
            <p>
              If an account exists with this email, you will receive a password reset link.
              Check your inbox (and spam folder) for the email.
            </p>
            <p className="redirect-message">
              Redirecting to login in a few seconds...
            </p>
            <Link to="/login" className="back-link">
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <p className="auth-subtitle">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="auth-button"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
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
                Don't have an account?{' '}
                <Link to="/register" className="auth-link">
                  Register here
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
