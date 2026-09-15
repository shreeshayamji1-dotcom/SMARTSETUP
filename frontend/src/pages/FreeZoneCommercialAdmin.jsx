import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { supabaseRest } from '../lib/supabaseRest';

const ADMIN_ROLES = ['founder', 'admin', 'manager', 'staff', 'reviewer'];
const money = (v) => `AED ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function serviceMode(pkg) {
  if (!pkg) return null;
  if (pkg.freezone === 'IFZA') return { service: 'new_registration' };
  const n = String(pkg.package_name || '');
  if (/^New Registration Upfront Discount/i.test(n)) return { service: 'new_registration', mode: 'full_advance' };
  if (/^All Inclusive Installment Available/i.test(n)) return { service: 'new_registration', mode: 'installment' };
  if (/^Pay As You Go - /i.test(n)) return { service: 'new_registration', mode: 'payg' };
  if (/^Renewal Upfront Discount/i.test(n)) return { service: 'renewal', mode: 'full_advance' };
  if (/^Renewal All Inclusive Installment Available/i.test(n)) return { service: 'renewal', mode: 'installment' };
  if (/^Pay As You Go Renewal/i.test(n)) return { service: 'renewal', mode: 'payg' };
  return null;
}

function pickVolumeTier(schedule, volume) {
  const rules = schedule?.volume_rules || {};
  const n = Number(volume || 0);
  return Object.entries(rules).find(([, r]) => n >= Number(r.min || 0) && (r.max == null || n <= Number(r.max)))?.[0] || '';
}

export default function FreeZoneCommercialAdmin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = localStorage.getItem('ssu_token');
  const [zone, setZone] = useState('ANCFZ');
  const [packages, setPackages] = useState([]);
  const [components, setComponents] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [packageId, setPackageId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [tier, setTier] = useState('');
  const [annualVolume, setAnnualVolume] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  useEffect(() => { if (!loading && !user) navigate('/login?redirect=/admin/freezone-commercial'); }, [loading, user, navigate]);

  async function load() {
    try {
      const [p, c, s] = await Promise.all([
        supabaseRest.select('freezone_packages', `?select=id,freezone,package_name,package_type,duration_years,visa_count,base_price,promotion_price,currency,notes&freezone=eq.${zone}&is_active=eq.true&order=display_order.asc,visa_count.asc`, token),
        supabaseRest.select('freezone_fee_components', `?select=*&freezone=eq.${zone}&is_active=eq.true&customer_visible=eq.true&order=service_request.asc,pricing_mode.asc,component_code.asc`, token),
        supabaseRest.select('agent_commission_schedules', `?select=id,freezone,service_request,pricing_mode,duration_years,commission_type,tier_matrix,volume_rules,source_document,source_page,source_sha256,source_notes&freezone=eq.${zone}&is_active=eq.true&order=duration_years.asc,pricing_mode.asc`, token),
      ]);
      setPackages(p || []); setComponents(c || []); setSchedules(s || []);
      setPackageId(''); setScheduleId(''); setTier('');
    } catch (e) { toast({ title: 'Commercial data could not load', description: e.message || 'Check admin RLS.' }); }
  }

  useEffect(() => { if (user && isAdmin) load(); }, [user, isAdmin, zone]);

  const pkg = useMemo(() => packages.find((x) => x.id === packageId) || null, [packages, packageId]);
  const mapping = useMemo(() => serviceMode(pkg), [pkg]);
  const matchingSchedules = useMemo(() => schedules.filter((s) => s.service_request === mapping?.service && (!mapping?.mode || s.pricing_mode === mapping.mode) && Number(s.duration_years || 0) === Number(pkg?.duration_years || 0)), [schedules, mapping, pkg]);
  const schedule = useMemo(() => schedules.find((s) => s.id === scheduleId) || matchingSchedules[0] || null, [schedules, scheduleId, matchingSchedules]);
  const isIFZA = zone === 'IFZA';
  const tierEntries = useMemo(() => Object.entries(schedule?.tier_matrix || {}), [schedule]);
  const selectedTier = useMemo(() => tier || (isIFZA ? tierEntries[0]?.[0] : pickVolumeTier(schedule, annualVolume)), [tier, isIFZA, tierEntries, schedule, annualVolume]);
  const commission = useMemo(() => {
    if (!schedule || !selectedTier || !pkg) return null;
    const row = schedule.tier_matrix?.[selectedTier];
    const amount = row?.amounts?.[Number(pkg.visa_count || 0)];
    const payable = row?.partner_payable?.[Number(pkg.visa_count || 0)];
    return amount == null ? null : { amount: Number(amount), rate: Number(row.rate || 0), label: row.label, payable: payable == null ? Number(pkg.base_price || 0) - Number(amount) : Number(payable) };
  }, [schedule, selectedTier, pkg]);

  const breakdown = useMemo(() => {
    if (!pkg) return [];
    const rows = components.filter((c) => c.service_request === mapping?.service && Number(c.duration_years || 0) === Number(pkg.duration_years || 0) && (c.pricing_mode === mapping?.mode || c.pricing_mode === 'package'));
    return rows.filter((r) => r.component_code !== 'source_conflict_note');
  }, [components, pkg, mapping]);

  const componentAmount = (row) => {
    const n = Number(pkg?.visa_count || 0);
    const m = row.amount_matrix || {};
    if (row.calculation_type === 'per_visa') return Number(m.amount || 0) * n;
    if (row.calculation_type === 'fixed') return Number(m.amount || 0);
    if (row.calculation_type === 'matrix') return Number(m[String(n)] || 0);
    return null;
  };

  const sourceConflict = components.find((c) => c.freezone === 'ANCFZ' && c.component_code === 'source_conflict_note');
  const customerTotal = Number(pkg?.promotion_price || pkg?.base_price || 0);

  async function createSettlement() {
    if (!pkg || !schedule || !selectedTier || !company.trim()) { toast({ title: 'Complete required fields', description: 'Select a package, commission rule and company name.' }); return; }
    if (!isIFZA && !annualVolume) { toast({ title: 'Annual registration volume required', description: 'ANCFZ commission is controlled by the published yearly registration tiers.' }); return; }
    setBusy(true);
    try {
      const result = await supabaseRest.rpc('create_freezone_settlement_invoice', { p_package_id: pkg.id, p_schedule_id: schedule.id, p_tier_key: selectedTier, p_company_name: company, p_customer_email: email, p_customer_phone: phone, p_addons: [], p_order_id: null, p_notes: `${isIFZA ? 'IFZA May-2026 source-controlled settlement.' : `ANCFZ annual eligible registration volume: ${annualVolume}.`} Source-controlled pricing/commission.` }, token);
      toast({ title: `Settlement FZS-${String(result.invoice_no).padStart(6, '0')} created`, description: `${money(result.commission_amount)} commission; ${money(result.net_payable_to_freezone)} payable to ${zone}.` });
    } catch (e) { toast({ title: 'Settlement creation failed', description: e.message || 'Server rejected the settlement.' }); }
    finally { setBusy(false); }
  }

  if (loading || !user) return null;
  if (!isAdmin) return <><Navbar /><main className="min-h-[60vh] grid place-items-center"><div className="text-center"><h1 className="text-2xl font-semibold">Admin access required</h1><p className="mt-2 text-slate-600">This commercial pricing and settlement area is restricted.</p></div></main><Footer /></>;

  return <div><Navbar />
    <section className="hero-gradient grain"><div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 pb-10"><div className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-semibold">Admin • Free Zone Commercial Engine</div><h1 className="mt-2 font-display text-4xl lg:text-5xl font-semibold text-slate-900">Pricing, fee transparency & commission</h1><p className="mt-3 text-slate-600 max-w-4xl">Source-controlled Free Zone packages, visible included charges, exact partner commission and settlement. Customer charges and commission are deliberately kept separate.</p><div className="mt-5 flex gap-3 flex-wrap"><Button onClick={() => navigate('/admin')} variant="outline" className="rounded-full">Back to Admin</Button><Button onClick={() => navigate('/admin/commission')} variant="outline" className="rounded-full">ANCFZ Legacy Settlement</Button></div></div></section>
    <main className="bg-white py-10"><div className="max-w-7xl mx-auto px-5 lg:px-8 space-y-7">
      <section className="card-elevated rounded-3xl p-7"><div className="flex flex-wrap gap-3"><Button onClick={() => setZone('ANCFZ')} variant={zone === 'ANCFZ' ? 'default' : 'outline'} className="rounded-full">ANCFZ</Button><Button onClick={() => setZone('IFZA')} variant={zone === 'IFZA' ? 'default' : 'outline'} className="rounded-full">IFZA</Button></div><div className="grid md:grid-cols-2 gap-4 mt-6"><div><label className="text-sm font-medium">Free Zone package *</label><select className="mt-2 w-full h-10 rounded-md border border-slate-300 px-3 bg-white" value={packageId} onChange={(e) => setPackageId(e.target.value)}><option value="">Select package</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.package_name} — {money(p.base_price)}{p.promotion_price ? ` / promo ${money(p.promotion_price)}` : ''}</option>)}</select></div><div><label className="text-sm font-medium">Registered company *</label><Input className="mt-2" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" /></div><div><label className="text-sm font-medium">Customer email</label><Input className="mt-2" value={email} onChange={(e) => setEmail(e.target.value)} /></div><div><label className="text-sm font-medium">Customer phone</label><Input className="mt-2" value={phone} onChange={(e) => setPhone(e.target.value)} /></div></div></section>

      {pkg && <section className="grid lg:grid-cols-[1fr_.9fr] gap-7"><div className="card-elevated rounded-3xl p-7"><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Customer price</div><div className="mt-2 text-3xl font-semibold">{money(customerTotal)}</div><div className="mt-2 text-sm text-slate-600">{pkg.duration_years} year(s) • {pkg.visa_count}{pkg.visa_count === 4 && isIFZA ? '+' : ''} visa band • {pkg.notes || 'Source-controlled package'}</div><div className="mt-6 flex flex-wrap gap-3 text-xs"><span className="px-3 py-1 rounded-full bg-slate-100">Official standard: {money(pkg.base_price)}</span>{pkg.promotion_price && <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">May 2026 promo: {money(pkg.promotion_price)}</span>}</div><div className="mt-7"><div className="font-semibold">Fee transparency</div>{breakdown.length ? <div className="mt-3 overflow-x-auto"><table className="w-full text-sm min-w-[720px]"><thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Component</th><th>Scope</th><th>Published amount</th><th>Package treatment</th></tr></thead><tbody>{breakdown.map((r) => <tr key={r.id} className="border-b border-slate-100"><td className="py-3 font-medium">{r.component_name}</td><td>{r.charge_scope}</td><td>{r.calculation_type === 'note' ? 'See source' : money(componentAmount(r))}</td><td>{r.included_in_package ? 'Included in package total' : 'Not included'}</td></tr>)}</tbody></table></div> : <div className="mt-3 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">The source does not publish a component-level breakdown for this package. We therefore show the official package total and do <b>not</b> manufacture a visa/licence split.</div>}</div>{zone === 'IFZA' && <div className="mt-6 rounded-2xl border bg-amber-50 p-4 text-sm text-amber-800"><b>IFZA excluded/additional charges:</b> Establishment Card/renewal, status changes, Investor/Partner titles, VIP services, medical exams and Emirates ID registration costs are identified by the source as not covered. Amounts are not invented here.</div>}{zone === 'ANCFZ' && sourceConflict && <div className="mt-6 rounded-2xl border bg-amber-50 p-4 text-sm text-amber-800"><b>Source-control warning:</b> the ANCFZ commission PDF prints a 1-visa PAYG renewal total of AED 10,088, while another ANCFZ source previously supplied reports AED 10,588. This is deliberately flagged rather than silently reconciled.</div>}</div>

      <div className="card-elevated rounded-3xl p-7"><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Partner commission</div>{isIFZA ? <div className="mt-5"><label className="text-sm font-medium">IFZA partner plan *</label><select className="mt-2 w-full h-10 rounded-md border border-slate-300 px-3 bg-white" value={schedule?.id || ''} onChange={(e) => setScheduleId(e.target.value)}><option value="">Select plan</option>{matchingSchedules.map((s) => <option key={s.id} value={s.id}>{s.tier_matrix?.[Object.keys(s.tier_matrix || {})[0]]?.label || s.pricing_mode}</option>)}</select><div className="mt-3 text-xs text-amber-700">The captured IFZA material establishes Plan A/Plan B exact commission amounts. It does not provide a verified annual-volume trigger in the extract available to this build, so no volume threshold is invented.</div></div> : <div className="mt-5"><label className="text-sm font-medium">Eligible completed registrations this year *</label><Input className="mt-2" type="number" min="1" value={annualVolume} onChange={(e) => setAnnualVolume(e.target.value)} placeholder="e.g. 17" /><div className="mt-2 text-xs text-slate-500">ANCFZ tiers: 1–10 = 35%, 11–20 = 40%, 21–30 = 45%, 31–350 = 50%, 351+ = 55%, according to the supplied commission source.</div></div>}{commission ? <div className="mt-6 rounded-2xl bg-slate-50 p-5"><div className="text-sm text-slate-500">Applicable rule</div><div className="mt-1 font-semibold">{commission.label}</div><div className="mt-4 grid grid-cols-2 gap-4"><div><div className="text-xs text-slate-500">Commission</div><div className="text-2xl font-semibold">{money(commission.amount)}</div></div><div><div className="text-xs text-slate-500">Partner payable</div><div className="text-2xl font-semibold">{money(commission.payable)}</div></div></div></div> : <div className="mt-6 rounded-2xl border p-4 text-sm text-slate-500">Select the package and applicable commission rule to calculate the exact published amount.</div>}<Button disabled={busy || !commission} onClick={createSettlement} className="mt-6 w-full rounded-full h-11">{busy ? 'Creating settlement…' : `Create ${zone} settlement`}</Button></div></section>}
    </div></main><Footer /></div>;
}
