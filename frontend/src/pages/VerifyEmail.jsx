import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import './Auth.css';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        console.log('Verifying token:', token);
        const response = await api.post('/user/verify', {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log('Verification response:', response.data);
        setVerified(true);
        toast.success('Email verified successfully!');
        setTimeout(() => navigate('/login'), 2000);
      } catch (error) {
        console.error('Verification error:', error);
        toast.error(error.response?.data?.message || 'Email verification failed');
        setVerified(false);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      verifyEmail();
    }
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Verifying Your Email...</h2>
          <p>Please wait while we verify your email address.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        {verified ? (
          <>
            <h2>✅ Email Verified!</h2>
            <p>Your email has been successfully verified.</p>
            <p>Redirecting to login page...</p>
            <Link to="/login" className="btn btn-primary">
              Go to Login
            </Link>
          </>
        ) : (
          <>
            <h2>❌ Verification Failed</h2>
            <p>The verification link is invalid or expired.</p>
            <Link to="/register" className="btn btn-primary">
              Register Again
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
