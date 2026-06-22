import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FileText, MessageCircle, ClipboardCheck, ShieldCheck, ArrowUpRight, Building2 } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = ['founder', 'manager', 'staff', 'reviewer'].includes(user?.role);

  useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);

  if (!user) return null;

  const consultations = JSON.parse(localStorage.getItem('ssu_consultations') || '[]');
  const leads = JSON.parse(localStorage.getItem('ssu_leads') || '[]');

  const stats = [
    { l: 'Open Applications', n: 1, i: ClipboardCheck },
    { l: 'Documents Uploaded', n: 3, i: FileText },
    { l: 'Advisor Messages', n: 2, i: MessageCircle },
    { l: 'KYC Status', n: 'Verified', i: ShieldCheck },
  ];

  return (
    <div>
      <Navbar />
      <section className="hero-gradient grain">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 lg:pt-16 pb-10">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-semibold">Client Dashboard</div>
          <h1 className="mt-2 font-display text-4xl lg:text-5xl font-semibold text-slate-900">Welcome back, {user.name?.split(' ')[0] || 'there'}.</h1>
          <p className="mt-2 text-slate-600">Here's a snapshot of your UAE setup journey.</p>
          {isAdmin && (
            <div className="mt-5">
              <Button onClick={() => navigate('/admin')} variant="outline" className="rounded-full px-5 h-11">
                Go to Admin Panel
              </Button>
            </div>
          )}
        </div>
      </section>
      <section className="py-10 bg-[#FFFCF5]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((s) => (
            <div key={s.l} className="card-elevated rounded-2xl p-6">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 grid place-items-center"><s.i className="h-4 w-4 brand-emerald" /></div>
              <div className="font-display text-3xl font-bold text-slate-900 mt-3">{s.n}</div>
              <div className="text-sm text-slate-600">{s.l}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="py-10 bg-[#FFFCF5]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 grid lg:grid-cols-3 gap-6">
          <div className="card-elevated rounded-2xl p-7 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="font-display text-xl font-semibold text-slate-900">Application: IFZA Dubai Trade Licence</div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">In Progress</span>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { t: 'Activity & jurisdiction confirmed', d: 'Match score 96%', done: true },
                { t: 'KYC documents uploaded', d: 'Passport + Photo + Application Form', done: true },
                { t: 'Government submission', d: 'Under review at IFZA portal', done: false, active: true },
                { t: 'Trade licence issuance', d: 'ETA 5–7 working days', done: false },
                { t: 'Bank account opening', d: 'Mashreq + WIO scheduled', done: false },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`h-6 w-6 rounded-full grid place-items-center mt-0.5 ${s.done ? 'bg-emerald-500 text-white' : s.active ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <span className="text-[10px] font-bold">{i + 1}</span>
                  </div>
                  <div>
                    <div className={`font-medium ${s.done ? 'text-slate-900' : 'text-slate-700'}`}>{s.t}</div>
                    <div className="text-xs text-slate-500">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="card-elevated rounded-2xl p-6">
              <div className="font-display text-lg font-semibold text-slate-900">Your Advisor</div>
              <div className="flex items-center gap-3 mt-4">
                <img src="https://i.pravatar.cc/80?img=15" alt="Advisor" className="h-12 w-12 rounded-full" />
                <div>
                  <div className="font-semibold text-slate-900">Hassan Al Awar</div>
                  <div className="text-xs text-emerald-600 flex items-center gap-1"><span className="pulse-dot" /> Online now</div>
                </div>
              </div>
              <Button className="btn-primary rounded-full w-full mt-4 h-10"><MessageCircle className="h-4 w-4 mr-2" /> Message Advisor</Button>
            </div>
            <div className="card-elevated rounded-2xl p-6">
              <div className="font-display text-lg font-semibold text-slate-900">Recent Requests</div>
              <div className="mt-3 space-y-3">
                {[...consultations, ...leads].slice(-3).reverse().map((r, i) => (
                  <div key={i} className="text-sm border-l-2 border-emerald-200 pl-3">
                    <div className="font-medium text-slate-800">{r.service || r.activity || 'Smart Finder'}</div>
                    <div className="text-xs text-slate-500">{new Date(r.at).toLocaleString()}</div>
                  </div>
                ))}
                {consultations.length === 0 && leads.length === 0 && (
                  <div className="text-sm text-slate-500">No requests yet. <a href="/consultation" className="brand-emerald font-semibold">Book a call</a>.</div>
                )}
              </div>
            </div>
            <div className="card-elevated rounded-2xl p-6 bg-emerald-50 border-emerald-200">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 brand-emerald mt-1" />
                <div>
                  <div className="font-display text-lg font-semibold text-slate-900">Free AI Website</div>
                  <p className="text-sm text-slate-700 mt-1">Eligible on orders above AED 10,000. Talk to your advisor to claim.</p>
                  <a href="#" className="inline-flex items-center gap-1 brand-emerald text-sm font-semibold mt-2">Learn more <ArrowUpRight className="h-3 w-3" /></a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
