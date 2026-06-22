import React, { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { FREE_ZONES } from '../mock';
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
  const [freezones, setFreezones] = useState(FREE_ZONES.map((z) => ({ ...z, active: true })));
  const [livePackages, setLivePackages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [roleRows, setRoleRows] = useState([]);
  const [activities, setActivities] = useState([]);
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  useEffect(() => {
    if (!loading && !user) navigate('/login?redirect=/admin');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user && isAdmin) { loadLeads(); loadActivities(); loadPackages(); loadOrders(); loadRoles(); }
  }, [user, isAdmin, loadLeads, loadActivities, loadPackages, loadOrders, loadRoles]);

  const loadLeads = useCallback(async () => {
    const token = localStorage.getItem('ssu_token');
    const pending = JSON.parse(localStorage.getItem('ssu_leads') || '[]');
    const consultations = JSON.parse(localStorage.getItem('ssu_consultations') || '[]');
    setLocalLeads([...pending, ...consultations]);
    try {
      const rows = await supabaseRest.select('leads', '?select=*&order=created_at.desc&limit=100', token);
      setLeads(rows || []);
      toast({ title: 'Leads loaded', description: `${rows?.length || 0} Supabase leads found.` });
    } catch (e) {
      toast({ title: 'Could not load Supabase leads', description: e.message || 'Check SQL policies/admin role.' });
    }
  }, [toast]);


  const loadPackages = useCallback(async () => {
    try {
      const rows = await loadFreezonePackages();
      setLivePackages(rows || []);
    } catch (e) {
      setLivePackages([]);
      toast({ title: 'Could not load live packages', description: e.message || 'Check freezone_packages read policy.' });
    }
  }, [toast]);

  const loadOrders = useCallback(async () => {
    const token = localStorage.getItem('ssu_token');
    try {
      const rows = await supabaseRest.select('checkout_orders', '?select=*&order=created_at.desc&limit=100', token);
      setOrders(rows || []);
    } catch (e) {
      setOrders([]);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    const token = localStorage.getItem('ssu_token');
    try {
      const profiles = await supabaseRest.select('profiles', '?select=id,email,full_name,name,role,is_active,created_at&order=created_at.desc&limit=100', token).catch(() => []);
      const admins = await supabaseRest.select('admin_profiles', '?select=*&order=created_at.desc&limit=100', token).catch(() => []);
      const normalized = [...(profiles || []), ...(admins || [])].filter((r) => ADMIN_ROLES.includes(r.role));
      setRoleRows(normalized);
    } catch (e) {
      setRoleRows([]);
    }
  }, []);

  const loadActivities = useCallback(async () => {
    try {
      const rows = await supabaseRest.select('activities_master', '?select=id,freezone,activity_name,activity_code,industry_group,is_active&order=freezone.asc&limit=100');
      setActivities(rows || []);
    } catch (e) {
      // Admin can still use lead panel if activity policies are not open yet.
    }
  }, []);

  const updateFreezoneLocal = (id, key, value) => {
    setFreezones((prev) => prev.map((z) => (z.id === id ? { ...z, [key]: value } : z)));
    toast({ title: 'Local preview updated', description: 'For live pricing database edits, connect a pricing table later.' });
  };

  if (loading || !user) return null;

  if (!isAdmin) {
    return <div><Navbar /><section className="hero-gradient grain min-h-[60vh]"><div className="max-w-6xl mx-auto px-5 lg:px-8 py-20 text-center"><div className="text-2xl font-semibold text-slate-900">Admin access required</div><p className="mt-3 text-slate-600">You must be Admin, Manager, Staff or Reviewer.</p><Button onClick={() => navigate('/dashboard')} className="mt-6 rounded-full px-6 h-11">Go back</Button></div></section><Footer /></div>;
  }

  const allLeads = [...leads, ...localLeads.map((l, i) => ({ id: `local-${i}`, ...l, local_only: true }))];

  return (
    <div>
      <Navbar />
      <section className="hero-gradient grain">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 pb-10">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-semibold">Admin Panel</div>
          <h1 className="mt-2 font-display text-4xl lg:text-5xl font-semibold text-slate-900">Leads, pricing preview and staff access.</h1>
          <p className="mt-3 text-slate-600 max-w-3xl">Connected to Supabase project smrsaedmuaizlesehpee. Lead forms now insert directly into the Supabase leads table.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => setTab('leads')} variant={tab === 'leads' ? 'default' : 'outline'} className="rounded-full px-5 h-11">Lead Capture</Button>
            <Button onClick={() => setTab('pricing')} variant={tab === 'pricing' ? 'default' : 'outline'} className="rounded-full px-5 h-11">Pricing Preview</Button>
            <Button onClick={() => setTab('activities')} variant={tab === 'activities' ? 'default' : 'outline'} className="rounded-full px-5 h-11">Activity Master</Button>
            <Button onClick={() => setTab('orders')} variant={tab === 'orders' ? 'default' : 'outline'} className="rounded-full px-5 h-11">Orders</Button>
            <Button onClick={() => setTab('roles')} variant={tab === 'roles' ? 'default' : 'outline'} className="rounded-full px-5 h-11">Admin Roles</Button>
            <Button onClick={loadLeads} variant="outline" className="rounded-full px-5 h-11">Reload</Button>
          </div>
        </div>
      </section>

      <section className="bg-white py-10">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 space-y-6">
          {tab === 'leads' && (
            <div className="card-elevated rounded-3xl p-7">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Captured Leads</div><div className="mt-2 text-lg font-semibold text-slate-900">{allLeads.length} total shown</div></div>
                <div className="text-xs text-slate-500">Local-only means the browser cached it when Supabase was unavailable.</div>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Date</th><th>Name</th><th>Phone</th><th>Email</th><th>Source</th><th>Activity / Message</th><th>Status</th></tr></thead>
                  <tbody>
                    {allLeads.map((l) => (
                      <tr key={l.id || `${l.name}-${l.phone_number}-${l.created_at}`} className="border-b border-slate-100">
                        <td className="py-3 text-slate-500">{l.created_at ? new Date(l.created_at).toLocaleString() : l.at ? new Date(l.at).toLocaleString() : '-'}</td>
                        <td className="font-medium text-slate-900">{l.name || '-'}</td>
                        <td>{[l.phone_country_code, l.phone_number || l.phone].filter(Boolean).join(' ') || '-'}</td>
                        <td>{l.email || '-'}</td>
                        <td>{l.source_page || l.source || '-'}</td>
                        <td className="max-w-[260px] truncate">{l.business_activity || l.activity || l.message || '-'}</td>
                        <td><span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs">{l.local_only ? 'local-only' : l.status || 'new'}</span></td>
                      </tr>
                    ))}
                    {allLeads.length === 0 && <tr><td colSpan="7" className="py-8 text-center text-slate-500">No leads yet. Submit any form and reload.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'pricing' && (
            <div className="card-elevated rounded-3xl p-7">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Live Pricing</div><div className="mt-2 text-lg font-semibold text-slate-900">{livePackages.length} Supabase package rows shown</div></div>
                <Button onClick={loadPackages} variant="outline" className="rounded-full px-5 h-10">Reload Packages</Button>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Free Zone</th><th>Package</th><th>Duration</th><th>Workspace</th><th>Base AED</th><th>Service AED</th><th>Status</th></tr></thead>
                  <tbody>
                    {livePackages.map((pkg) => (
                      <tr key={pkg.id} className="border-b border-slate-100">
                        <td className="py-3 font-medium text-slate-900">{pkg.freezone_name}</td>
                        <td>{pkg.package_name}</td>
                        <td>{pkg.duration}</td>
                        <td>{pkg.workspace || '-'}</td>
                        <td>AED {Number(pkg.base_price || 0).toLocaleString()}</td>
                        <td>AED {Number(pkg.service_fee || 0).toLocaleString()}</td>
                        <td><span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs">{pkg.is_active === false ? 'inactive' : 'active'}</span></td>
                      </tr>
                    ))}
                    {livePackages.length === 0 && <tr><td colSpan="7" className="py-8 text-center text-slate-500">No live packages loaded. Check freezone_packages RLS read policy.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'orders' && (
            <div className="card-elevated rounded-3xl p-7">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Checkout Orders</div><div className="mt-2 text-lg font-semibold text-slate-900">{orders.length} latest Supabase orders</div></div>
                <Button onClick={loadOrders} variant="outline" className="rounded-full px-5 h-10">Reload Orders</Button>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm min-w-[1000px]">
                  <thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Created</th><th>Reference</th><th>Customer</th><th>Package</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id || o.reference} className="border-b border-slate-100">
                        <td className="py-3 text-slate-500">{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                        <td className="font-mono font-semibold">{o.reference || o.id}</td>
                        <td>{o.customer_name || o.customer_email || '-'}</td>
                        <td>{o.freezone || o.package_name || '-'}</td>
                        <td>AED {Number(o.total_aed || o.total || 0).toLocaleString()}</td>
                        <td>{o.payment_status || '-'}</td>
                        <td>{o.order_status || o.status || '-'}</td>
                      </tr>
                    ))}
                    {orders.length === 0 && <tr><td colSpan="7" className="py-8 text-center text-slate-500">No orders loaded. Create a checkout order and reload.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}



          {tab === 'activities' && (
            <div className="card-elevated rounded-3xl p-7">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Activities Master</div><div className="mt-2 text-lg font-semibold text-slate-900">{activities.length} latest activities shown</div></div>
                <Button onClick={loadActivities} variant="outline" className="rounded-full px-5 h-10">Reload Activities</Button>
              </div>
              <p className="mt-3 text-sm text-slate-600">This reads from Supabase table <b>activities_master</b>. Use this to confirm SPC, Mainland, RAKEZ, Meydan and other activity data is available before upload.</p>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Jurisdiction</th><th>Activity</th><th>Code</th><th>Industry</th><th>Active</th></tr></thead>
                  <tbody>
                    {activities.map((a) => (
                      <tr key={a.id || `${a.freezone}-${a.activity_code}-${a.activity_name}`} className="border-b border-slate-100">
                        <td className="py-3 font-medium text-slate-900">{a.freezone || '-'}</td>
                        <td>{a.activity_name || '-'}</td>
                        <td>{a.activity_code || '-'}</td>
                        <td>{a.industry_group || '-'}</td>
                        <td><span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs">{a.is_active === false ? 'No' : 'Yes'}</span></td>
                      </tr>
                    ))}
                    {activities.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-slate-500">No activities loaded. Check RLS read policy for activities_master.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'roles' && (
            <div className="card-elevated rounded-3xl p-7">
              <div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Roles</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">Admin / Manager / Staff / Reviewer</div>
              <p className="mt-3 text-slate-600">Roles are read from Supabase profiles/admin_profiles. Server-side RLS must still enforce permissions; the UI does not replace database policies.</p>
              <div className="mt-5 overflow-x-auto"><table className="w-full text-sm min-w-[700px]"><thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Name</th><th>Email</th><th>Role</th><th>Active</th></tr></thead><tbody>{roleRows.map((r) => <tr key={r.id || r.user_id || r.email} className="border-b border-slate-100"><td className="py-3 font-medium text-slate-900">{r.full_name || r.name || '-'}</td><td>{r.email || '-'}</td><td>{r.role}</td><td>{r.is_active === false ? 'No' : 'Yes'}</td></tr>)}{roleRows.length === 0 && <tr><td colSpan="4" className="py-8 text-center text-slate-500">No admin role rows loaded. Check profiles/admin_profiles read policy.</td></tr>}</tbody></table></div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
