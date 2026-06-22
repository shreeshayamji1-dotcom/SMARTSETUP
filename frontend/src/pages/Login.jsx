import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import { Sparkles, LogIn, UserPlus, Mail } from 'lucide-react';

const COUNTRY_CODES = ['+971', '+91', '+92', '+880', '+966', '+974', '+965', '+968', '+973', '+44', '+1', '+65'];

export default function Login() {
  const [mode, setMode] = useState('login');
  const [data, setData] = useState({ name: '', email: '', password: '', phoneCode: '+971', phone: '' });
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const redirectTo = new URLSearchParams(location.search).get('redirect') || '/dashboard';

  const submit = async (e) => {
    e.preventDefault();
    if (!data.email || !data.password) {
      toast({ title: 'Enter email and password' });
      return;
    }
    if (mode === 'register' && !data.name) {
      toast({ title: 'Enter your name' });
      return;
    }
    setBusy(true);
    const result =
      mode === 'login'
        ? await login(data.email, data.password)
        : await register(data.name, data.email, data.password, data.phone, data.phoneCode);
    setBusy(false);
    if (!result.ok) {
      toast({ title: 'Authentication failed', description: result.error });
      return;
    }
    toast({
      title: mode === 'login' ? 'Welcome back' : 'Account created',
      description: 'Redirecting…',
    });
    setTimeout(() => navigate(redirectTo), 300);
  };

  const socialNotice = (provider) =>
    toast({
      title: `${provider} sign-in coming in Phase 5`,
      description: 'For now, please use email + password. We are integrating Google + Facebook OAuth shortly.',
    });

  return (
    <div>
      <Navbar />
      <section className="hero-gradient grain min-h-[80vh]">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 pt-16 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 brand-bronze" />
              <span className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Client Portal</span>
            </div>
            <h1 className="mt-4 font-display text-5xl lg:text-6xl font-semibold text-slate-900 leading-[1.02]">
              Your setup,<br /><span className="shine-text">all in one place.</span>
            </h1>
            <p className="mt-5 text-slate-600 max-w-md">
              Track licence status, upload KYC, view bank account progress and message your advisor. Available 24/7.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              <li>✓ Real-time application tracking</li>
              <li>✓ Secure document vault</li>
              <li>✓ Direct advisor messaging</li>
            </ul>
          </div>
          <div className="card-elevated rounded-3xl p-7 lg:p-9" data-testid="auth-card">
            <div className="flex p-1 bg-slate-100 rounded-full text-sm font-semibold">
              <button
                data-testid="auth-tab-login"
                onClick={() => setMode('login')}
                className={`flex-1 py-2 rounded-full transition ${mode === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
              >
                Sign in
              </button>
              <button
                data-testid="auth-tab-register"
                onClick={() => setMode('register')}
                className={`flex-1 py-2 rounded-full transition ${mode === 'register' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
              >
                Create account
              </button>
            </div>

            {/* Social login (mocked stub for Phase 5) */}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => socialNotice('Google')}
                data-testid="auth-google-btn"
                className="h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => socialNotice('Facebook')}
                data-testid="auth-facebook-btn"
                className="h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
                Facebook
              </button>
            </div>

            <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
              <div className="flex-1 h-px bg-slate-200" /> or use email <div className="flex-1 h-px bg-slate-200" />
            </div>

            <form onSubmit={submit} className="space-y-4" data-testid="auth-form">
              {mode === 'register' && (
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Name</label>
                  <Input
                    data-testid="auth-name-input"
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                    className="mt-1.5 h-11 rounded-lg"
                    placeholder="Your full name"
                  />
                </div>
              )}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Email</label>
                <Input
                  data-testid="auth-email-input"
                  type="email"
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                  className="mt-1.5 h-11 rounded-lg"
                  placeholder="you@company.com"
                />
              </div>
              {mode === 'register' && (
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Phone / WhatsApp</label>
                  <div className="mt-1.5 grid grid-cols-[112px_1fr] gap-2">
                    <select
                      data-testid="auth-phone-code-select"
                      value={data.phoneCode}
                      onChange={(e) => setData({ ...data, phoneCode: e.target.value })}
                      className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    >
                      {COUNTRY_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
                    </select>
                    <Input
                      data-testid="auth-phone-input"
                      value={data.phone}
                      onChange={(e) => setData({ ...data, phone: e.target.value })}
                      className="h-11 rounded-lg"
                      placeholder="50 123 4567"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Password</label>
                <Input
                  data-testid="auth-password-input"
                  type="password"
                  value={data.password}
                  onChange={(e) => setData({ ...data, password: e.target.value })}
                  className="mt-1.5 h-11 rounded-lg"
                  placeholder="At least 6 characters"
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                data-testid="auth-submit-btn"
                className="btn-primary rounded-full w-full h-12"
              >
                {busy ? (
                  'Please wait…'
                ) : mode === 'login' ? (
                  <><LogIn className="h-4 w-4 mr-2" /> Sign in</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-2" /> Create account</>
                )}
              </Button>
              <div className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1">
                <Mail className="h-3 w-3" /> By continuing you agree to our Terms and Privacy Policy.
              </div>
            </form>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
