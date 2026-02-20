import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import './Auth.css';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [email] = useState(location.state?.email || '');

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    if (!email) {
      toast.error('Email not found. Please register again.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/user/verify-otp', {
        email,
        otp
      });

      toast.success(response.data.message);
      console.log('OTP verified successfully:', response.data);
      
      // Store user info and redirect to login
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) {
      toast.error('Email not found. Please register again.');
      return;
    }

    setResendLoading(true);
    try {
      const response = await api.post('/user/reverify', { email });
      toast.success(response.data.message);
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  if (!email) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Email Not Found</h2>
          <p>Please register first to verify your email.</p>
          <Link to="/register" className="btn btn-primary">
            Go to Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Enter Verification Code</h2>
        <p>We've sent a 6-digit code to <strong>{email}</strong></p>
        
        <form onSubmit={handleVerifyOTP}>
          <div className="form-group">
            <label htmlFor="otp">6-Digit OTP</label>
            <input
              type="text"
              id="otp"
              placeholder="000000"
              value={otp}
              onChange={handleOtpChange}
              maxLength="6"
              disabled={loading}
              className="otp-input"
              style={{
                fontSize: '24px',
                letterSpacing: '10px',
                textAlign: 'center',
                fontWeight: 'bold'
              }}
            />
            <small>Code expires in 10 minutes</small>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full"
            disabled={loading || otp.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button
          onClick={handleResendOTP}
          disabled={resendLoading}
          className="btn btn-secondary btn-full"
          style={{ marginTop: '10px' }}
        >
          {resendLoading ? 'Sending...' : 'Resend Code'}
        </button>

        <div className="auth-links" style={{ marginTop: '20px', textAlign: 'center' }}>
          <p>
            Didn't sign up? <Link to="/register">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
