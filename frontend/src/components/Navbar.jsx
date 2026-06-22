import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, ShieldCheck, LogOut, User, LayoutDashboard } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';

const NAV = [
  {
    label: 'Business Setup',
    children: [
      { label: 'Free Zone Finder', href: '/free-zones' },
      { label: 'Mainland Setup', href: '/mainland' },
      { label: 'Compare Jurisdictions', href: '/compare' },
      { label: 'Activity Search', href: '/ai-search' },
      { label: 'Cost Calculator', href: '/calculator' },
    ],
  },
  {
    label: 'Visa Services',
    children: [
      { label: 'Golden Visa', href: '/golden-visa' },
      { label: 'Investor Visa', href: '/services/investor-visa' },
      { label: 'Employment Visa', href: '/services/employment-visa' },
      { label: 'Family Visa', href: '/services/family-visa' },
    ],
  },
  {
    label: 'Corporate Services',
    children: [
      { label: 'VAT Registration', href: '/services/vat-registration' },
      { label: 'Corporate Tax', href: '/services/corporate-tax' },
      { label: 'Accounting', href: '/services/accounting' },
      { label: 'PRO Services', href: '/services/pro-services' },
      { label: 'Compliance', href: '/services/compliance' },
    ],
  },
  {
    label: 'Resources',
    children: [
      { label: 'Blog', href: '/blog' },
      { label: 'FAQs', href: '/faqs' },
      { label: 'Guides', href: '/blog' },
      { label: 'Founder Club', href: '/founder-club' },
    ],
  },
  {
    label: 'Company',
    children: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/consultation' },
      { label: 'Consultation', href: '/consultation' },
    ],
  },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState('');
  const [acct, setAcct] = useState(false);
  const acctRef = useRef(null);
  const navRef = useRef(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (acctRef.current && !acctRef.current.contains(e.target)) setAcct(false);
      if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu('');
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => { setOpen(false); setOpenMenu(''); setAcct(false); }, [location.pathname]);

  const isActive = (href) => location.pathname === href;

  return (
    <header className={`sticky top-0 z-40 transition-all ${scrolled ? 'backdrop-blur-md bg-[#FFFCF5]/90 border-b border-emerald-900/10' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="flex items-center justify-between h-[72px] gap-6">
          {/* LEFT: Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="h-9 w-9 rounded-xl bg-brand-emerald grid place-items-center text-[#FFFCF5] font-display text-lg font-bold transition-transform group-hover:scale-105">S</div>
            <div className="leading-tight">
              <div className="font-display text-[18px] font-bold tracking-tight text-slate-800">SmartSetup<span className="brand-emerald">UAE</span></div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 flex items-center gap-1"><ShieldCheck className="h-3 w-3 brand-emerald" /> Axiscrest Global FZE LLC</div>
            </div>
          </Link>

          {/* CENTER: Navigation */}
          <nav ref={navRef} className="hidden lg:flex items-center gap-6 flex-1 justify-center">
            {NAV.map((n) =>
              n.children ? (
                <div key={n.label} className="relative">
                  <button onClick={() => setOpenMenu((menu) => (menu === n.label ? '' : n.label))} className="text-sm font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1 link-underline">
                    {n.label} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openMenu === n.label ? 'rotate-180' : ''}`} />
                  </button>
                  {openMenu === n.label && (
                    <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-60 bg-white rounded-2xl shadow-2xl border border-emerald-900/10 p-2 fade-up">
                      {n.children.map((c) => (
                        <Link key={c.href} to={c.href} className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive(c.href) ? 'bg-emerald-50 brand-emerald' : 'text-slate-700 hover:bg-emerald-50 hover:brand-emerald'}`}>{c.label}</Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link key={n.href} to={n.href} className={`text-sm font-medium link-underline ${isActive(n.href) ? 'brand-emerald' : 'text-slate-700 hover:text-slate-900'}`}>
                  {n.label}
                </Link>
              )
            )}
          </nav>

          {/* RIGHT: Account / CTA */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {user ? (
              <div className="relative" ref={acctRef}>
                <button onClick={() => setAcct((a) => !a)} className="flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 hover:border-emerald-700/30 bg-white transition-colors">
                  <div className="h-7 w-7 rounded-full bg-emerald-100 grid place-items-center brand-emerald font-bold text-xs">{(user.name || 'U').charAt(0).toUpperCase()}</div>
                  <span className="text-sm font-medium text-slate-700">{user.name?.split(' ')[0] || 'Account'}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${acct ? 'rotate-180' : ''}`} />
                </button>
                {acct && (
                  <div className="absolute top-full mt-2 right-0 w-56 bg-white rounded-2xl shadow-2xl border border-emerald-900/10 p-2 fade-up">
                    <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:brand-emerald"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
                    <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:brand-emerald"><User className="h-4 w-4" /> Edit Profile</Link>
                    <button onClick={() => { logout(); navigate('/'); }} className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-600"><LogOut className="h-4 w-4" /> Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900">Client Login</Link>
            )}
            <Button onClick={() => navigate('/consultation')} className="btn-primary rounded-full px-5">Book Free Call</Button>
          </div>

          {/* MOBILE TOGGLE */}
          <button className="lg:hidden p-2 -mr-2" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE PANEL */}
      {open && (
        <div className="lg:hidden bg-[#FFFCF5] border-t border-emerald-900/10 max-h-[calc(100vh-72px)] overflow-y-auto">
          <div className="px-5 py-4 flex flex-col gap-1">
            {NAV.map((n) => n.children ? (
              <div key={n.label} className="py-1">
                <div className="text-[11px] uppercase tracking-[0.2em] font-semibold text-slate-500 mt-2 mb-1 px-2">{n.label}</div>
                {n.children.map((c) => (
                  <Link key={c.href} to={c.href} className="block py-2 px-2 font-medium text-slate-800">{c.label}</Link>
                ))}
              </div>
            ) : (
              <Link key={n.href} to={n.href} className="py-2 px-2 font-medium text-slate-800">{n.label}</Link>
            ))}
            <div className="border-t border-emerald-900/10 my-2" />
            {user ? (
              <>
                <Link to="/dashboard" className="py-2 px-2 font-medium text-slate-800">Dashboard</Link>
                <button onClick={() => { logout(); navigate('/'); }} className="text-left py-2 px-2 font-medium text-red-600">Logout</button>
              </>
            ) : (
              <Link to="/login" className="py-2 px-2 font-medium text-slate-800">Client Login</Link>
            )}
            <Button onClick={() => navigate('/consultation')} className="btn-primary rounded-full mt-3">Book Free Consultation</Button>
          </div>
        </div>
      )}
    </header>
  );
}
