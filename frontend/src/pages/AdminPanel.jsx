import React, { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { supabaseRest } from '../lib/supabaseRest';
import { loadFreezonePackages } from '../lib/pricingService';

const ADMIN_ROLES = ['founder', 'admin', 'manager', 'staff', 'reviewer'];

export default function AdminPanel() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState('leads');
  const [leads, setLeads] = useState([]);
  const [localLeads, setLocalLeads] = useState([]);
  const [livePackages, setLivePackages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [roleRows, setRoleRows] = useState([]);
  const [activities, setActivities] = useState([]);
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  const loadLeads = useCallback(async () => {
    const token = localStorage.getItem('ssu_token');
    const safeJson = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
    setLocalLeads([...safeJson('ssu_leads'), ...safeJson('ssu_consultations')]);
    try { const rows = await supabaseRest.select('leads', '?select=*&order=created_at.desc&limit=100', token); setLeads(rows || []); }
    catch (e) { toast({ title: 'Could not load Supabase leads', description: e.message || 'Check SQL policies/admin role.' }); }
  }, [toast]);

  const loadPackages = useCallback(async () => {
    try { const rows = await loadFreezonePackages(); setLivePackages(rows || []); }
    catch (e) { setLivePackages([]); toast({ title: 'Could not load live packages', description: e.message || 'Check pricing read policy.' }); }
  }, [toast]);

  const loadOrders = useCallback(async () => {
    const token = localStorage.getItem('ssu_token');
    try { const rows = await supabaseRest.select('checkout_orders', '?select=*&order=created_at.desc&limit=100', token); setOrders(rows || []); }
    catch (e) { setOrders([]); toast({ title: 'Could not load checkout orders', description: e.message || 'Check order RLS.' }); }
  }, [toast]);

  const loadRoles = useCallback(async () => {
    const token = localStorage.getItem('ssu_token');
    try {
      const profiles = await supabaseRest.select('profiles', '?select=id,email,full_name,role,assigned_manager,created_at&order=created_at.desc&limit=100', token).catch(() => []);
      setRoleRows((profiles || []).filter((r) => ADMIN_ROLES.includes(r.role)));
    } catch { setRoleRows([]); }
  }, []);

  const loadActivities = useCallback(async () => {
    try { const rows = await supabaseRest.select('activities_master', '?select=id,freezone,activity_name,activity_code,industry_group,is_active&order=freezone.asc&limit=100'); setActivities(rows || []); }
    catch { setActivities([]); }
  }, []);

  useEffect(() => { if (!loading && !user) navigate('/login?redirect=/admin'); }, [loading, user, navigate]);
  useEffect(() => { if (user && isAdmin) { loadLeads(); loadActivities(); loadPackages(); loadOrders(); loadRoles(); } }, [user, isAdmin, loadLeads, loadActivities, loadPackages, loadOrders, loadRoles]);

  if (loading || !user) return null;
  if (!isAdmin) return <div><Navbar/><section className="hero-gradient grain min-h-[60vh]"><div className="max-w-6xl mx-auto px-5 lg:px-8 py-20 text-center"><div className="text-2xl font-semibold">Admin access required</div><p className="mt-3 text-slate-600">You must have an authorised internal role.</p><Button onClick={()=>navigate('/dashboard')} className="mt-6 rounded-full px-6 h-11">Go back</Button></div></section><Footer/></div>;

  const allLeads = [...leads, ...localLeads.map((l, i) => ({ id: `local-${i}`, ...l, local_only: true }))];
  return <div><Navbar/><section className="hero-gradient grain"><div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 pb-10"><div className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-semibold">Admin Panel</div><h1 className="mt-2 font-display text-4xl lg:text-5xl font-semibold text-slate-900">Operations, pricing & staff access.</h1><p className="mt-3 text-slate-600 max-w-3xl">Connected to the live Supabase data layer. Commission information is kept in the restricted commercial engine.</p><div className="mt-6 flex flex-wrap gap-3"><Button onClick={()=>setTab('leads')} variant={tab==='leads'?'default':'outline'} className="rounded-full">Lead Capture</Button><Button onClick={()=>setTab('pricing')} variant={tab==='pricing'?'default':'outline'} className="rounded-full">Pricing Preview</Button><Button onClick={()=>setTab('activities')} variant={tab==='activities'?'default':'outline'} className="rounded-full">Activity Master</Button><Button onClick={()=>setTab('orders')} variant={tab==='orders'?'default':'outline'} className="rounded-full">Orders</Button><Button onClick={()=>setTab('roles')} variant={tab==='roles'?'default':'outline'} className="rounded-full">Admin Roles</Button><Button onClick={()=>navigate('/admin/freezone-commercial')} variant="outline" className="rounded-full">Free Zone Commercial</Button><Button onClick={loadLeads} variant="outline" className="rounded-full">Reload</Button></div></div></section>
  <section className="bg-white py-10"><div className="max-w-7xl mx-auto px-5 lg:px-8 space-y-6">
    {tab==='leads'&&<div className="card-elevated rounded-3xl p-7"><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Captured Leads</div><div className="mt-2 text-lg font-semibold">{allLeads.length} total shown</div><div className="mt-6 overflow-x-auto"><table className="w-full text-sm min-w-[900px]"><thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Date</th><th>Name</th><th>Phone</th><th>Email</th><th>Source</th><th>Activity / Message</th><th>Status</th></tr></thead><tbody>{allLeads.map(l=><tr key={l.id||`${l.name}-${l.phone_number}-${l.created_at}`} className="border-b border-slate-100"><td className="py-3 text-slate-500">{l.created_at?new Date(l.created_at).toLocaleString():l.at?new Date(l.at).toLocaleString():'-'}</td><td className="font-medium">{l.name||'-'}</td><td>{[l.phone_country_code,l.phone_number||l.phone].filter(Boolean).join(' ')||'-'}</td><td>{l.email||'-'}</td><td>{l.source_page||l.source||'-'}</td><td className="max-w-[260px] truncate">{l.business_activity||l.activity||l.message||l.biz_type||'-'}</td><td>{l.local_only?'local-only':l.status||'new'}</td></tr>)}{!allLeads.length&&<tr><td colSpan="7" className="py-8 text-center text-slate-500">No leads yet.</td></tr>}</tbody></table></div></div>}
    {tab==='pricing'&&<div className="card-elevated rounded-3xl p-7"><div className="flex justify-between items-center"><div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Live Pricing</div><div className="mt-2 text-lg font-semibold">{livePackages.length} package rows shown</div></div><Button onClick={loadPackages} variant="outline" className="rounded-full">Reload</Button></div><div className="mt-6 overflow-x-auto"><table className="w-full text-sm min-w-[900px]"><thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Free Zone</th><th>Package</th><th>Duration</th><th>Base AED</th><th>Service AED</th><th>Status</th></tr></thead><tbody>{livePackages.map(p=><tr key={p.id} className="border-b border-slate-100"><td className="py-3 font-medium">{p.freezone_name||p.freezone||'-'}</td><td>{p.package_name}</td><td>{p.duration||p.duration_years||'-'}</td><td>{Number(p.base_price||0).toLocaleString()}</td><td>{Number(p.service_fee||0).toLocaleString()}</td><td>{p.is_active===false?'inactive':'active'}</td></tr>)}{!livePackages.length&&<tr><td colSpan="6" className="py-8 text-center text-slate-500">No live packages loaded.</td></tr>}</tbody></table></div></div>}
    {tab==='orders'&&<div className="card-elevated rounded-3xl p-7"><div className="flex justify-between items-center"><div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Checkout Orders</div><div className="mt-2 text-lg font-semibold">{orders.length} latest orders</div></div><Button onClick={loadOrders} variant="outline" className="rounded-full">Reload</Button></div><div className="mt-6 overflow-x-auto"><table className="w-full text-sm min-w-[1000px]"><thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Created</th><th>Reference</th><th>Customer</th><th>Package</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>{orders.map(o=><tr key={o.id||o.order_ref} className="border-b border-slate-100"><td className="py-3">{o.created_at?new Date(o.created_at).toLocaleString():'-'}</td><td className="font-mono">{o.order_ref||o.id}</td><td>{o.customer_name||o.customer_email||'-'}</td><td>{o.package_name||o.freezone||'-'}</td><td>AED {Number(o.final_total||0).toLocaleString()}</td><td>{o.payment_provider||'-'}</td><td>{o.status||'-'}</td></tr>)}{!orders.length&&<tr><td colSpan="7" className="py-8 text-center text-slate-500">No orders loaded.</td></tr>}</tbody></table></div></div>}
    {tab==='activities'&&<div className="card-elevated rounded-3xl p-7"><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Activities Master</div><div className="mt-2 text-lg font-semibold">{activities.length} latest activities shown</div><div className="mt-6 overflow-x-auto"><table className="w-full text-sm min-w-[900px]"><thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Jurisdiction</th><th>Activity</th><th>Code</th><th>Industry</th><th>Active</th></tr></thead><tbody>{activities.map(a=><tr key={a.id||`${a.freezone}-${a.activity_code}-${a.activity_name}`} className="border-b border-slate-100"><td className="py-3 font-medium">{a.freezone||'-'}</td><td>{a.activity_name||'-'}</td><td>{a.activity_code||'-'}</td><td>{a.industry_group||'-'}</td><td>{a.is_active===false?'No':'Yes'}</td></tr>)}{!activities.length&&<tr><td colSpan="5" className="py-8 text-center text-slate-500">No activities loaded.</td></tr>}</tbody></table></div></div>}
    {tab==='roles'&&<div className="card-elevated rounded-3xl p-7"><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Roles</div><div className="mt-2 text-lg font-semibold">Founder / Admin / Manager / Staff / Reviewer</div><p className="mt-3 text-slate-600">Role assignment must use the protected database RPCs; direct profile role mutation is blocked.</p><div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Name</th><th>Email</th><th>Role</th><th>Manager</th></tr></thead><tbody>{roleRows.map(r=><tr key={r.id||r.email} className="border-b border-slate-100"><td className="py-3 font-medium">{r.full_name||'-'}</td><td>{r.email||'-'}</td><td>{r.role}</td><td>{r.assigned_manager||'-'}</td></tr>)}{!roleRows.length&&<tr><td colSpan="4" className="py-8 text-center text-slate-500">No internal role rows loaded.</td></tr>}</tbody></table></div></div>}
  </div></section><Footer/></div>;
}
