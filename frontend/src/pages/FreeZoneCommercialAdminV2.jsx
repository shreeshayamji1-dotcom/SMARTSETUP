import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { supabaseRest } from '../lib/supabaseRest';

const ROLES = ['founder', 'admin', 'manager', 'staff', 'reviewer'];
const ZONES = ['ANCFZ', 'DAFZA', 'DMCC', 'IFZA', 'Meydan', 'RAKEZ', 'SHAMS', 'SPC'];
const money = (v) => `AED ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function packageMode(pkg) {
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

function tierForVolume(schedule, count) {
  const n = Number(count || 0);
  return Object.entries(schedule?.volume_rules || {}).find(([, r]) => n >= Number(r.min || 0) && (r.max == null || n <= Number(r.max)))?.[0] || '';
}

function escapeHtml(v) { return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function printSettlement(invoice, items) {
  const no = `FZS-${String(invoice.invoice_no).padStart(6, '0')}`;
  const rows = (items || []).map((x) => `<tr><td>${escapeHtml(x.description)}</td><td>${x.quantity}</td><td>${money(x.unit_price)}</td><td>${money(x.gross_amount)}</td><td>${money(x.commission_amount)}</td><td>${money(x.net_payable)}</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${no}</title><style>@page{size:A4;margin:15mm}body{font-family:Arial,sans-serif;color:#172033;font-size:12px}.top{display:flex;justify-content:space-between;border-bottom:2px solid #172033;padding-bottom:14px}.muted{color:#64748b}.brand{font-size:11px;text-transform:uppercase;letter-spacing:2px;font-weight:700;color:#475569}h1{margin:5px 0;font-size:22px}.box{border:1px solid #dbe2ea;border-radius:7px;padding:11px;margin-top:12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left}th{background:#f1f5f9;font-size:9px;text-transform:uppercase}.summary{width:380px;margin-left:auto;margin-top:16px}.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eef2f7}.total{font-weight:700;font-size:14px}.foot{margin-top:28px;border-top:1px solid #e2e8f0;padding-top:9px;font-size:9px;color:#64748b}</style></head><body><div class="top"><div><div class="brand">SmartSetupUAE.ae</div><h1>Free Zone Settlement Invoice</h1><div class="muted">Internal partner commission settlement</div></div><div><b>${no}</b><br>${new Date(invoice.created_at).toLocaleDateString()}</div></div><div class="box"><b>Company</b><br>${escapeHtml(invoice.company_name)}<br><span class="muted">${escapeHtml(invoice.freezone)} • ${escapeHtml(invoice.service_request)} • ${escapeHtml(invoice.pricing_mode)}</span></div><table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Published value</th><th>Commission earned</th><th>Net payable</th></tr></thead><tbody>${rows}</tbody></table><div class="summary"><div class="row"><span>Published value</span><b>${money(invoice.gross_package_amount)}</b></div><div class="row"><span>Add-ons</span><b>${money(invoice.addons_total)}</b></div><div class="row"><span>Commission earned</span><b>${money(invoice.commission_amount)}</b></div><div class="row total"><span>Net payable to Free Zone</span><b>${money(invoice.net_payable_to_freezone)}</b></div></div><div class="box"><b>Source</b><br>${escapeHtml(invoice.source_snapshot?.commission_schedule?.source_document || invoice.source_snapshot?.commission_schedule?.source_document || 'Source not supplied')} • page ${invoice.source_snapshot?.commission_schedule?.source_page || '-'}<br><span class="muted">${escapeHtml(invoice.source_snapshot?.commission_schedule?.source_sha256 || '')}</span></div><div class="foot">Internal settlement document. Commission figures are restricted to authorised admin users and are not a customer-facing price or tax invoice.</div></body></html>`;
  const w = window.open('', '_blank'); if (!w) return; w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 250);
}

export default function FreeZoneCommercialAdminV2() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [zone, setZone] = useState('ANCFZ');
  const [packages, setPackages] = useState([]);
  const [components, setComponents] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [summary, setSummary] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [packageId, setPackageId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [tier, setTier] = useState('');
  const [annualVolume, setAnnualVolume] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fromVisa, setFromVisa] = useState('0');
  const [toVisa, setToVisa] = useState('1');
  const [calc, setCalc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('calculator');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [recordService, setRecordService] = useState('new_registration');
  const [recordCompany, setRecordCompany] = useState('');
  const [newSchedule, setNewSchedule] = useState({ freezone: 'ANCFZ', service_request: 'new_registration', pricing_mode: 'full_advance', duration_years: '1', commission_type: 'tiered_matrix', fixed_commission: '', tier_matrix: '{\n  "35": {"label":"Example / replace with source", "rate":35, "amounts":[0]}\n}', volume_rules: '{\n  "35": {"min":1,"max":10}\n}', source_document: '', source_page: '', source_sha256: '', source_notes: '' });
  const isAdmin = ROLES.includes(user?.role);
  const isOwnerAdmin = ['founder', 'admin'].includes(user?.role);
  const token = localStorage.getItem('ssu_token');

  useEffect(() => { if (!loading && !user) navigate('/login?redirect=/admin/freezone-commercial'); }, [loading, user, navigate]);

  async function loadAll() {
    try {
      const [p, c, s, i, a] = await Promise.all([
        supabaseRest.select('freezone_packages', `?select=id,freezone,package_name,package_type,duration_years,visa_count,base_price,discount_price,promotion_price,currency,notes&freezone=eq.${zone}&is_active=eq.true&order=display_order.asc,visa_count.asc`, token),
        supabaseRest.select('freezone_fee_components', `?select=*&freezone=eq.${zone}&is_active=eq.true&customer_visible=eq.true&order=service_request.asc,pricing_mode.asc,component_code.asc`, token).catch(() => []),
        supabaseRest.select('agent_commission_schedules', `?select=id,freezone,service_request,pricing_mode,duration_years,commission_type,fixed_commission,tier_matrix,volume_rules,source_document,source_page,source_sha256,source_notes&freezone=eq.${zone}&is_active=eq.true&order=duration_years.asc,pricing_mode.asc,service_request.asc`, token),
        supabaseRest.select('freezone_settlement_invoices', '?select=*&order=created_at.desc&limit=100', token).catch(() => []),
        supabaseRest.rpc('get_freezone_annual_registration_summary', { p_year: Number(year) }, token),
      ]);
      setPackages(p || []); setComponents(c || []); setSchedules(s || []); setInvoices(i || []); setSummary(a || []);
      setPackageId(''); setScheduleId(''); setTier(''); setCalc(null);
    } catch (e) { toast({ title: 'Commercial data could not load', description: e.message || 'Check admin access and Supabase RLS.' }); }
  }
  useEffect(() => { if (user && isAdmin) loadAll(); }, [user, isAdmin, zone, year]);

  const pkg = useMemo(() => packages.find((x) => x.id === packageId) || null, [packages, packageId]);
  const mode = useMemo(() => packageMode(pkg), [pkg]);
  const matching = useMemo(() => schedules.filter((s) => s.service_request === mode?.service && (!mode?.mode || s.pricing_mode === mode.mode) && Number(s.duration_years || 0) === Number(pkg?.duration_years || 0)), [schedules, mode, pkg]);
  const schedule = useMemo(() => schedules.find((s) => s.id === scheduleId) || matching[0] || null, [schedules, scheduleId, matching]);
  const zoneCount = useMemo(() => summary.find((x) => String(x.freezone).toLowerCase() === zone.toLowerCase()) || null, [summary, zone]);
  const feeRows = useMemo(() => components.filter((c) => c.service_request === mode?.service && Number(c.duration_years || 0) === Number(pkg?.duration_years || 0) && (c.pricing_mode === mode?.mode || c.pricing_mode === 'package')), [components, mode, pkg]);
  const tierEntries = useMemo(() => Object.entries(schedule?.tier_matrix || {}), [schedule]);
  const selectedTier = tier || (schedule?.volume_rules ? tierForVolume(schedule, annualVolume) : (tierEntries[0]?.[0] || ''));
  const selectedTierRow = schedule?.tier_matrix?.[selectedTier];
  const commissionAmount = selectedTierRow?.amounts?.[Number(pkg?.visa_count || 0)];
  const partnerPayable = selectedTierRow?.partner_payable?.[Number(pkg?.visa_count || 0)];
  const customerPrice = Number(pkg?.promotion_price ?? pkg?.discount_price ?? pkg?.base_price ?? 0);

  function feeAmount(row) {
    const n = Number(pkg?.visa_count || 0); const m = row.amount_matrix || {};
    if (row.calculation_type === 'per_visa') return Number(m.amount || 0) * n;
    if (row.calculation_type === 'fixed') return Number(m.amount || 0);
    if (row.calculation_type === 'matrix') return Number(m[String(n)] || 0);
    return null;
  }

  async function calculateUpgrade() {
    const s = schedules.find((x) => x.service_request === 'upgrade');
    if (!s) { setCalc(null); toast({ title: 'No upgrade commission source', description: 'This Free Zone has no supplied upgrade schedule.' }); return; }
    try { setScheduleId(s.id); const r = await supabaseRest.rpc('calculate_freezone_service_commission', { p_schedule_id: s.id, p_from_visa: Number(fromVisa), p_to_visa: Number(toVisa), p_service_amount: null, p_volume_year: Number(year) }, token); setCalc(r); } catch (e) { setCalc(null); toast({ title: 'Upgrade calculation failed', description: e.message || 'Check the published matrix.' }); }
  }

  async function createPackageSettlement() {
    if (!pkg || !schedule || !company.trim()) { toast({ title: 'Complete required fields', description: 'Select a package, valid source schedule and company.' }); return; }
    if (!selectedTier) { toast({ title: 'Commission rule unavailable', description: 'No source-supported tier/plan is available. Do not guess it.' }); return; }
    if (schedule.volume_rules && !annualVolume) { toast({ title: 'Annual volume required', description: 'Record/enter the eligible completed registrations for the selected year.' }); return; }
    setBusy(true);
    try {
      const result = await supabaseRest.rpc('create_freezone_package_settlement_invoice', { p_package_id: pkg.id, p_schedule_id: schedule.id, p_tier_key: selectedTier, p_company_name: company, p_customer_email: email, p_customer_phone: phone, p_addons: [], p_volume_year: Number(year), p_notes: 'Phase 100 source-controlled settlement.' }, token);
      const invoice = (await supabaseRest.select('freezone_settlement_invoices', `?select=*&id=eq.${result.invoice_id}`, token))[0];
      const items = await supabaseRest.select('freezone_settlement_invoice_items', `?select=*&invoice_id=eq.${result.invoice_id}&order=line_no.asc`, token);
      toast({ title: `Settlement FZS-${String(result.invoice_no).padStart(6, '0')} created`, description: `${money(result.commission_amount)} commission earned; ${money(result.net_payable_to_freezone)} payable to ${zone}.` });
      if (invoice) printSettlement(invoice, items || []);
      await loadAll();
    } catch (e) { toast({ title: 'Settlement creation failed', description: e.message || 'Server rejected the settlement.' }); }
    finally { setBusy(false); }
  }

  async function createUpgradeSettlement() {
    const s = schedules.find((x) => x.service_request === 'upgrade');
    if (!s || !company.trim()) { toast({ title: 'Company and ANCFZ upgrade source are required' }); return; }
    setBusy(true);
    try {
      const result = await supabaseRest.rpc('create_freezone_service_settlement_invoice', { p_schedule_id: s.id, p_company_name: company, p_service_amount: null, p_from_visa: Number(fromVisa), p_to_visa: Number(toVisa), p_year: Number(year), p_notes: 'ANCFZ upgrade settlement. Published upgrade fee and AED 500 commission kept separate.' }, token);
      const invoice = (await supabaseRest.select('freezone_settlement_invoices', `?select=*&id=eq.${result.invoice_id}`, token))[0];
      const items = await supabaseRest.select('freezone_settlement_invoice_items', `?select=*&invoice_id=eq.${result.invoice_id}&order=line_no.asc`, token);
      toast({ title: `Upgrade settlement FZS-${String(result.invoice_no).padStart(6, '0')} created`, description: `${money(result.commission_amount)} commission; service fee ${money(result.service_amount)}.` });
      if (invoice) printSettlement(invoice, items || []);
      await loadAll();
    } catch (e) { toast({ title: 'Upgrade settlement failed', description: e.message || 'Published transition may not exist.' }); }
    finally { setBusy(false); }
  }

  async function recordRegistration() {
    if (!recordCompany.trim()) { toast({ title: 'Company name required' }); return; }
    setBusy(true);
    try { await supabaseRest.rpc('record_freezone_registration', { p_freezone: zone, p_company_name: recordCompany, p_service_request: recordService, p_registration_date: `${year}-12-31`, p_order_id: null, p_notes: 'Admin-recorded completed Free Zone registration.' }, token); setRecordCompany(''); toast({ title: 'Completed registration recorded', description: `${zone} ${recordService} added to ${year} volume.` }); await loadAll(); } catch (e) { toast({ title: 'Could not record registration', description: e.message || 'Check admin role.' }); } finally { setBusy(false); }
  }

  async function addSchedule() {
    if (!isOwnerAdmin) return;
    try {
      const tm = JSON.parse(newSchedule.tier_matrix); const vr = newSchedule.volume_rules.trim() ? JSON.parse(newSchedule.volume_rules) : null;
      await supabaseRest.rpc('admin_create_commission_schedule', { p_freezone: newSchedule.freezone, p_service_request: newSchedule.service_request, p_pricing_mode: newSchedule.pricing_mode, p_duration_years: Number(newSchedule.duration_years || 0), p_commission_type: newSchedule.commission_type, p_fixed_commission: newSchedule.fixed_commission === '' ? null : Number(newSchedule.fixed_commission), p_tier_matrix: tm, p_volume_rules: vr, p_source_document: newSchedule.source_document, p_source_page: newSchedule.source_page === '' ? null : Number(newSchedule.source_page), p_source_sha256: newSchedule.source_sha256, p_source_notes: newSchedule.source_notes }, token);
      toast({ title: 'Commission schedule added', description: 'It is now available to the authorised admin engine only.' }); await loadAll();
    } catch (e) { toast({ title: 'Schedule not added', description: e.message || 'Check JSON and source fields.' }); }
  }

  if (loading || !user) return null;
  if (!isAdmin) return <><Navbar /><main className="min-h-[60vh] grid place-items-center"><div className="text-center"><h1 className="text-2xl font-semibold">Admin access required</h1><p className="mt-2 text-slate-600">Commercial and commission data is restricted to authorised admin roles.</p></div></main><Footer /></>;

  return <div><Navbar /><section className="hero-gradient grain"><div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 pb-10"><div className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-semibold">Admin • Phase 100 Commercial Engine</div><h1 className="mt-2 font-display text-4xl lg:text-5xl font-semibold text-slate-900">Free Zone pricing, fee transparency & commission</h1><p className="mt-3 text-slate-600 max-w-4xl">Commission is admin-only. Customer pricing remains separate. Published package prices, service fees, commission rules and source documents are kept distinct so invoices can be accurate without inventing missing data.</p></div></section>
    <main className="bg-white py-10"><div className="max-w-7xl mx-auto px-5 lg:px-8 space-y-7">
      <div className="flex flex-wrap gap-2">{ZONES.map((z) => <Button key={z} onClick={() => { setZone(z); setTab('calculator'); }} variant={zone === z ? 'default' : 'outline'} className="rounded-full">{z}</Button>)}</div>
      <div className="flex flex-wrap gap-2 border-b pb-3"><Button onClick={() => setTab('calculator')} variant={tab === 'calculator' ? 'default' : 'outline'} className="rounded-full">Calculator</Button><Button onClick={() => setTab('volume')} variant={tab === 'volume' ? 'default' : 'outline'} className="rounded-full">Annual Volume</Button><Button onClick={() => setTab('invoices')} variant={tab === 'invoices' ? 'default' : 'outline'} className="rounded-full">Settlement Invoices</Button>{isOwnerAdmin && <Button onClick={() => setTab('sources')} variant={tab === 'sources' ? 'default' : 'outline'} className="rounded-full">Add Commission Source</Button>}</div>

      {tab === 'calculator' && <>
        <section className="card-elevated rounded-3xl p-7"><div className="grid md:grid-cols-2 gap-4"><div><label className="text-sm font-medium">Package</label><select className="mt-2 w-full h-10 rounded-md border border-slate-300 px-3 bg-white" value={packageId} onChange={(e) => setPackageId(e.target.value)}><option value="">Select {zone} package</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.package_name} — {money(p.base_price)}</option>)}</select></div><div><label className="text-sm font-medium">Registered company *</label><Input className="mt-2" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" /></div><div><label className="text-sm font-medium">Customer email</label><Input className="mt-2" value={email} onChange={(e) => setEmail(e.target.value)} /></div><div><label className="text-sm font-medium">Customer phone</label><Input className="mt-2" value={phone} onChange={(e) => setPhone(e.target.value)} /></div></div>{pkg && <div className="mt-5 rounded-2xl bg-slate-50 border p-4"><div className="font-semibold">{pkg.package_name}</div><div className="text-sm text-slate-600 mt-1">Customer price: {money(customerPrice)} • official source/base: {money(pkg.base_price)} • {pkg.duration_years} year(s) • {pkg.visa_count}{zone === 'IFZA' && pkg.visa_count === 4 ? '+' : ''} visa band</div></div>}</section>
        {pkg && <section className="grid lg:grid-cols-[1.1fr_.9fr] gap-7"><div className="card-elevated rounded-3xl p-7"><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Customer-visible fee information</div>{feeRows.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-sm min-w-[760px]"><thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Component</th><th>Scope</th><th>Amount</th><th>Treatment</th></tr></thead><tbody>{feeRows.map((r) => <tr key={r.id} className="border-b border-slate-100"><td className="py-3 font-medium">{r.component_name}</td><td>{r.charge_scope}</td><td>{r.calculation_type === 'note' ? 'Source note' : money(feeAmount(r))}</td><td>{r.included_in_package ? 'Included' : 'Additional'}</td></tr>)}</tbody></table></div> : <div className="mt-4 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">No component-level source data is loaded for this package. The system therefore shows the package price only and does not manufacture a visa/licence split.</div>}{zone === 'ANCFZ' && <p className="mt-4 text-xs text-slate-500">ANCFZ source inclusions include license, lease agreement, MOA/AOA where applicable, registry/certificates, bank letter, branch certificate where applicable, security approval, E-Channel, Establishment Card, Entry Permit, status change if applicable, normal Ajman medical, residency visa and Emirates ID. fileciteturn90file0L14-L35</p>}</div>
          <div className="card-elevated rounded-3xl p-7"><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Admin-only commission</div>{schedule ? <><div className="mt-4 text-sm text-slate-600">Source: {schedule.source_document || 'Not supplied'} • page {schedule.source_page || '-'}.</div>{schedule.volume_rules ? <div className="mt-4"><label className="text-sm font-medium">Eligible completed registrations in {year}</label><Input className="mt-2" type="number" min="1" value={annualVolume} onChange={(e) => setAnnualVolume(e.target.value)} placeholder="Enter or record the annual count" /><div className="mt-2 text-xs text-slate-500">ANCFZ source tiers: 1–10, 11–20, 21–30, 31–350, 351+. Renewal is a separate source rule and is not treated as new registration volume.</div></div> : <div className="mt-4"><label className="text-sm font-medium">Commission plan</label><select className="mt-2 w-full h-10 rounded-md border border-slate-300 px-3 bg-white" value={tier} onChange={(e) => setTier(e.target.value)}><option value="">Select source plan</option>{tierEntries.map(([k,v]) => <option key={k} value={k}>{v.label || k}</option>)}</select>{zone === 'IFZA' && <p className="mt-2 text-xs text-amber-700">IFZA Plan A/B annual-volume trigger is not present in the supplied extract. It must be selected from the source agreement; the system will not invent a threshold.</p>}</div>}{selectedTierRow && <div className="mt-5 rounded-2xl bg-slate-50 p-5"><div className="text-sm text-slate-500">Applicable source rule</div><div className="mt-1 font-semibold">{selectedTierRow.label || selectedTier}</div><div className="mt-4 text-3xl font-semibold">{commissionAmount == null ? '—' : money(commissionAmount)}</div><div className="text-sm text-slate-600">Commission earned • {selectedTierRow.rate || 'source'}{selectedTierRow.rate ? '%' : ''}{partnerPayable != null ? ` • partner payable ${money(partnerPayable)}` : ''}</div></div>}{schedule.source_notes && <p className="mt-3 text-xs text-amber-700">{schedule.source_notes}</p>}<Button className="mt-6 w-full" disabled={busy || !pkg || !schedule || !selectedTier} onClick={createPackageSettlement}>{busy ? 'Creating…' : 'Generate Admin Settlement Invoice'}</Button></> : <div className="mt-4 rounded-2xl border bg-amber-50 p-4 text-sm text-amber-800">No commission source is loaded for {zone}. Keep the existing price list unchanged. An authorised admin can add the verified source later.</div>}</div></section>}

        {zone === 'ANCFZ' && <section className="card-elevated rounded-3xl p-7"><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">ANCFZ upgrade service</div><p className="mt-2 text-sm text-slate-600">The ANCFZ source has a separate upgrade-fee matrix. Example: 0 → 1 visa is AED 7,612; the commission is a separate AED 500 per completed upgrade request. These must never be treated as the normal new-registration visa price.</p><div className="grid md:grid-cols-4 gap-4 mt-5"><div><label className="text-sm font-medium">From visas</label><select className="mt-2 w-full h-10 rounded-md border px-3" value={fromVisa} onChange={(e) => setFromVisa(e.target.value)}>{Array.from({length:10},(_,i)=><option key={i} value={i}>{i}</option>)}</select></div><div><label className="text-sm font-medium">To visas</label><select className="mt-2 w-full h-10 rounded-md border px-3" value={toVisa} onChange={(e) => setToVisa(e.target.value)}>{Array.from({length:11},(_,i)=><option key={i} value={i}>{i}</option>)}</select></div><div className="md:col-span-2 flex items-end gap-3"><Button onClick={calculateUpgrade} variant="outline">Calculate</Button><Button onClick={createUpgradeSettlement} disabled={busy || !company.trim()}>Generate Upgrade Settlement</Button></div></div>{calc && <div className="mt-5 rounded-2xl bg-slate-50 p-5"><div className="font-semibold">Published upgrade service fee: {money(calc.service_amount)}</div><div className="text-sm text-slate-600 mt-1">Commission earned: {money(calc.commission_amount)} • net payable: {money(calc.net_payable)}</div></div>}</section>}
      </>}

      {tab === 'volume' && <section className="grid lg:grid-cols-[1fr_1fr] gap-7"><div className="card-elevated rounded-3xl p-7"><div className="flex items-center justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Annual registrations</div><div className="mt-1 text-2xl font-semibold">{year}</div></div><Input className="max-w-[130px]" type="number" value={year} onChange={(e) => setYear(e.target.value)} /></div><div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Free Zone</th><th>New</th><th>Renewals</th></tr></thead><tbody>{summary.map((r)=><tr key={r.freezone} className="border-b border-slate-100"><td className="py-3 font-medium">{r.freezone}</td><td>{r.eligible_new_registrations || 0}</td><td>{r.eligible_renewals || 0}</td></tr>)}</tbody></table></div></div><div className="card-elevated rounded-3xl p-7"><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Record completed company</div><p className="mt-2 text-sm text-slate-600">Only completed, eligible records count toward annual commission volume. Drafts/cancelled records do not.</p><Input className="mt-4" value={recordCompany} onChange={(e)=>setRecordCompany(e.target.value)} placeholder={`${zone} company name`} /><select className="mt-3 w-full h-10 rounded-md border px-3" value={recordService} onChange={(e)=>setRecordService(e.target.value)}><option value="new_registration">New registration</option><option value="renewal">Renewal</option></select><Button className="mt-4 w-full" disabled={busy} onClick={recordRegistration}>Record completed registration</Button><div className="mt-5 text-xs text-slate-500">Current {zone} count: {zoneCount?.eligible_new_registrations || 0} eligible new registrations in {year}.</div></div></section>}

      {tab === 'invoices' && <section className="card-elevated rounded-3xl p-7"><div className="flex justify-between items-center"><div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Settlement history</div><div className="mt-1 text-xl font-semibold">Admin-only commission invoices</div></div><Button onClick={loadAll} variant="outline">Reload</Button></div><div className="mt-5 overflow-x-auto"><table className="w-full text-sm min-w-[1000px]"><thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Date</th><th>Free Zone</th><th>Company</th><th>Service</th><th>Published value</th><th>Commission</th><th>Net</th><th>Source</th></tr></thead><tbody>{invoices.map((x)=><tr key={x.id} className="border-b border-slate-100"><td className="py-3">{new Date(x.created_at).toLocaleDateString()}</td><td>{x.freezone}</td><td>{x.company_name}</td><td>{x.service_request}</td><td>{money(x.gross_package_amount)}</td><td className="font-semibold">{money(x.commission_amount)}</td><td>{money(x.net_payable_to_freezone)}</td><td>{x.source_snapshot?.commission_schedule?.source_document || '-'}</td></tr>)}{!invoices.length && <tr><td colSpan="8" className="py-8 text-center text-slate-500">No settlement invoices yet.</td></tr>}</tbody></table></div></section>}

      {tab === 'sources' && isOwnerAdmin && <section className="card-elevated rounded-3xl p-7"><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Add verified commission source</div><p className="mt-2 text-sm text-slate-600">Use this only when the actual Free Zone agreement/PDF supplies the rule. Missing values must remain missing; never invent a rate, threshold or fee.</p><div className="grid md:grid-cols-3 gap-4 mt-5"><Input placeholder="Free Zone" value={newSchedule.freezone} onChange={(e)=>setNewSchedule({...newSchedule,freezone:e.target.value})}/><Input placeholder="Service request" value={newSchedule.service_request} onChange={(e)=>setNewSchedule({...newSchedule,service_request:e.target.value})}/><Input placeholder="Pricing mode" value={newSchedule.pricing_mode} onChange={(e)=>setNewSchedule({...newSchedule,pricing_mode:e.target.value})}/><Input placeholder="Duration years" type="number" value={newSchedule.duration_years} onChange={(e)=>setNewSchedule({...newSchedule,duration_years:e.target.value})}/><Input placeholder="Commission type" value={newSchedule.commission_type} onChange={(e)=>setNewSchedule({...newSchedule,commission_type:e.target.value})}/><Input placeholder="Fixed commission (if applicable)" value={newSchedule.fixed_commission} onChange={(e)=>setNewSchedule({...newSchedule,fixed_commission:e.target.value})}/></div><textarea className="mt-4 w-full min-h-[140px] rounded-md border p-3 font-mono text-xs" value={newSchedule.tier_matrix} onChange={(e)=>setNewSchedule({...newSchedule,tier_matrix:e.target.value})}/><textarea className="mt-4 w-full min-h-[100px] rounded-md border p-3 font-mono text-xs" value={newSchedule.volume_rules} onChange={(e)=>setNewSchedule({...newSchedule,volume_rules:e.target.value})}/><div className="grid md:grid-cols-3 gap-4 mt-4"><Input placeholder="Source document" value={newSchedule.source_document} onChange={(e)=>setNewSchedule({...newSchedule,source_document:e.target.value})}/><Input placeholder="Source page" value={newSchedule.source_page} onChange={(e)=>setNewSchedule({...newSchedule,source_page:e.target.value})}/><Input placeholder="Source SHA-256" value={newSchedule.source_sha256} onChange={(e)=>setNewSchedule({...newSchedule,source_sha256:e.target.value})}/></div><textarea className="mt-4 w-full min-h-[90px] rounded-md border p-3" placeholder="Source notes" value={newSchedule.source_notes} onChange={(e)=>setNewSchedule({...newSchedule,source_notes:e.target.value})}/><Button className="mt-4" onClick={addSchedule}>Add verified schedule</Button></section>}
    </div></main><Footer /></div>;
}
