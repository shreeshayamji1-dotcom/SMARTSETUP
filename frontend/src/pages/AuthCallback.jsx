import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [message, setMessage] = useState('Completing sign-in…');

  useEffect(() => {
    const run = async () => {
      const hash = window.location.hash ? window.location.hash.substring(1) : '';
      const search = window.location.search ? window.location.search.substring(1) : '';
      const params = new URLSearchParams(hash || search);

      const error = params.get('error_description') || params.get('error');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token') || '';

      if (error) {
        setMessage('Sign-in failed. Redirecting…');
        window.history.replaceState(null, '', window.location.pathname);
        setTimeout(() => navigate('/login?error=' + encodeURIComponent(error)), 1200);
        return;
      }

      if (!accessToken) {
        navigate('/login');
        return;
      }

      const result = await loginWithToken(accessToken, refreshToken);
      window.history.replaceState(null, '', window.location.pathname);
      if (result.ok) {
        navigate('/dashboard');
      } else {
        setMessage('Could not complete sign-in. Redirecting…');
        setTimeout(() => navigate('/login?error=' + encodeURIComponent(result.error || 'oauth')), 1200);
      }
    };
    run();
  }, [loginWithToken, navigate]);

  return (
    <div className="min-h-[60vh] grid place-items-center bg-[#FFFCF5]" data-testid="auth-callback">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 rounded-2xl bg-emerald-50 grid place-items-center mb-4">
          <span className="brand-emerald font-display text-lg font-bold">S</span>
        </div>
        <p className="text-slate-600">{message}</p>
      </div>
    </div>
  );
}
