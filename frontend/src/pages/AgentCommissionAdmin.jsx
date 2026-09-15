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
const SOURCE_DOC = 'Agent Commission Structure V3 (1) (1).pdf';
const SOURCE_SHA = '907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c9';

const money = (value) => `AED ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function mapPackage(pkg) {
  const n = String(pkg?.package_name || '');
  if (/^New Registration Upfront Discount/i.test(n)) return ['new_registration', 'full_advance'];
  if (/^All Inclusive Installment Available/i.test(n)) return ['new_registration', 'installment'];
  if (/^Pay As You Go - /i.test(n)) return ['new_registration', 'payg'];
  if (/^Renewal Upfront Discount/i.test(n)) return ['renewal', 'full_advance'];
  if (/^Renewal All Inclusive Installment Available/i.test(n)) return ['renewal', 'installment'];
  if (/^Pay As You Go Renewal/i.test(n)) return ['renewal', 'payg'];
  return null;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function printInvoice(invoice, items) {
  const number = `FZS-${String(invoice.invoice_no).padStart(6, '0')}`;
  const rows = (items || []).map((x) => `<tr><td>${escapeHtml(x.description)}</td><td>${x.quantity}</td><td>${money(x.unit_price)}</td><td>${money(x.gross_amount)}</td><td>${money(x.commission_amount)}</td><td>${money(x.net_payable)}</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${number}</title><style>@page{size:A4;margin:15mm}body{font-family:Arial,sans-serif;color:#172033;font-size:12px}.top{display:flex;justify-content:space-between;border-bottom:2px solid #172033;padding-bottom:14px}.brand{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#475569;font-weight:700}h1{font-size:23px;margin:5px 0}.muted{color:#64748b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px}.box{border:1px solid #dbe2ea;padding:11px;border-radius:7px;margin-top:12px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left}th{background:#f1f5f9;font-size:9px;text-transform:uppercase}.summary{width:370px;margin-left:auto;margin-top:16px}.r{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eef2f7}.total{font-size:14px;font-weight:700;border:0}.foot{margin-top:30px;border-top:1px solid #e2e8f0;padding-top:9px;font-size:9px;color:#64748b}</style></head><body><div class="top"><div><div class="brand">SmartSetupUAE.ae</div><h1>Free Zone Settlement Invoice</h1><div class="muted">Agent commission settlement</div></div><div><b>${number}</b><br><span class="muted">${new Date(invoice.created_at).toLocaleDateString()}</span></div></div><div class="grid"><div class="box"><b>Prepared by</b><br>Axiscrest-Global FZE LLC<br>SmartSetupUAE.ae</div><div class="box"><b>Payable to</b><br>Ajman NuVentures Centre Free Zone (ANCFZ)<br>Amber Gem Tower, Mezzanine Floor, Sheikh Khalifa Street, P.O Box 4848, Ajman, United Arab Emirates</div></div><div class="box"><b>Registered company</b><br>${escapeHtml(invoice.company_name)}<br><span class="muted">${escapeHtml(invoice.service_request)} • ${escapeHtml(invoice.pricing_mode)} • ${invoice.duration_years || '-'} year(s) • ${invoice.visa_count} visa(s)</span></div><table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Company/FZ Price</th><th>Our Commission</th><th>Net Payable</th></tr></thead><tbody>${rows}</tbody></table><div class="summary"><div class="r"><span>Company/FZ package price</span><b>${money(invoice.gross_package_amount)}</b></div><div class="r"><span>Add-ons</span><b>${money(invoice.addons_total)}</b></div><div class="r"><span>Agent commission</span><b>- ${money(invoice.commission_amount)}</b></div><div class="r total"><span>Amount payable to ANCFZ</span><span>${money(invoice.net_payable_to_freezone)}</span></div></div><div class="box"><b>Commission source</b><br>${SOURCE_DOC}, Annexure-1 page ${invoice.source_snapshot?.commission_schedule?.source_page || '-'}<br><span class="muted">SHA-256: ${SOURCE_SHA}</span></div><div class="foot">Free-zone settlement document. It records the published/free-zone package value, applicable agent commission and net settlement. It is not a customer tax invoice.</div></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}

export default function AgentCommissionAdmin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [packages, setPackages] = useState([]);
  const [addons, setAddons] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [packageId, setPackageId] = useState('');
  const [tier, setTier] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addonQty, setAddonQty] = useState({});
  const [commission, setCommission] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dataBusy, setDataBusy] = useState(true);
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  const pkg = useMemo(() => packages.find((x) => x.id === packageId) || null, [packages, packageId]);
  const mapping = useMemo(() => mapPackage(pkg), [pkg]);
  const schedule = useMemo(() => schedules.find((x) => x.service_request === mapping?.[0] && x.pricing_mode === mapping?.[1] && Number(x.duration_years || 0) === Number(pkg?.duration_years || 0)) || null, [schedules, mapping, pkg]);
  const tierOptions = useMemo(() => Object.entries(schedule?.tier_matrix || {}).sort(([a], [b]) => Number(a) - Number(b)), [schedule]);
  const selectedAddons = useMemo(() => addons.filter((a) => Number(addonQty[a.id] || 0) > 0), [addons, addonQty]);
  const addonsTotal = selectedAddons.reduce((s, a) => s + Number(a.price || 0) * Number(addonQty[a.id] || 0), 0);
  const gross = Number(pkg?.base_price || 0) + addonsTotal;
  const net = Math.max(0, gross - Number(commission?.commission_amount || 0));

  async function loadData() {
    setDataBusy(true);
    const token = localStorage.getItem('ssu_token');
    try {
      const [p, a, s, i] = await Promise.all([
        supabaseRest.select('freezone_packages', '?select=id,freezone,package_name,package_type,duration_years,visa_count,base_price,currency&freezone=eq.ANCFZ&is_active=eq.true&order=package_name.asc', token),
        supabaseRest.select('package_addons', '?select=id,addon_name,addon_category,price,currency,notes&freezone=eq.ANCFZ&is_active=eq.true&order=addon_category.asc,addon_name.asc', token),
        supabaseRest.select('agent_commission_schedules', '?select=id,freezone,service_request,pricing_mode,duration_years,commission_type,fixed_commission,tier_matrix,source_document,source_page,source_sha256,source_notes&freezone=eq.ANCFZ&is_active=eq.true&order=service_request.asc,pricing_mode.asc,duration_years.asc', token),
        supabaseRest.select('freezone_settlement_invoices', '?select=*&order=created_at.desc&limit=50', token),
      ]);
      setPackages(p || []); setAddons(a || []); setSchedules(s || []); setInvoices(i || []);
    } catch (e) { toast({ title: 'Could not load commission data', description: e.message || 'Check admin access and Supabase migration.' }); }
    finally { setDataBusy(false); }
  }

  useEffect(() => { if (!loading && !user) navigate('/login?redirect=/admin/commission'); }, [loading, user, navigate]);
  useEffect(() => { if (user && isAdmin) loadData(); }, [user, isAdmin]);
  useEffect(() => { setTier(''); setCommission(null); }, [schedule?.id]);
  useEffect(() => {
    let dead = false;
    if (!schedule || !tier || !pkg) return undefined;
    supabaseRest.rpc('calculate_agent_commission', { p_schedule_id: schedule.id, p_tier_key: tier, p_visa_count: Number(pkg.visa_count || 0) }, localStorage.getItem('ssu_token')).then((r) => { if (!dead) setCommission(r); }).catch(() => { if (!dead) setCommission(null); });
    return () => { dead = true; };
  }, [schedule, tier, pkg]);

  async function createSettlement() {
    if (!pkg || !schedule || !tier || !company.trim()) { toast({ title: 'Complete required fields', description: 'Select a package, exact commission tier and registered company.' }); return; }
    setBusy(true);
    try {
      const rows = Object.entries(addonQty).filter(([, q]) => Number(q) > 0).map(([id, quantity]) => ({ id, quantity: Number(quantity) }));
      const result = await supabaseRest.rpc('create_freezone_settlement_invoice', { p_package_id: pkg.id, p_schedule_id: schedule.id, p_tier_key: tier, p_company_name: company, p_customer_email: email, p_customer_phone: phone, p_addons: rows, p_order_id: null, p_notes: 'ANCFZ settlement generated from source-controlled commission schedule.' }, localStorage.getItem('ssu_token'));
      const invoice = (await supabaseRest.select('freezone_settlement_invoices', `?select=*&id=eq.${result.invoice_id}`, localStorage.getItem('ssu_token')))[0];
      const items = await supabaseRest.select('freezone_settlement_invoice_items', `?select=*&invoice_id=eq.${result.invoice_id}&order=line_no.asc`, localStorage.getItem('ssu_token'));
      await loadData();
      toast({ title: `FZS-${String(result.invoice_no).padStart(6, '0')} created`, description: `${money(result.net_payable_to_freezone)} payable to ANCFZ after ${money(result.commission_amount)} commission.` });
      if (invoice) printInvoice(invoice, items || []);
    } catch (e) { toast({ title: 'Invoice creation failed', description: e.message || 'The server rejected the settlement.' }); }
    finally { setBusy(false); }
  }

  async function printExisting(inv) {
    try { const items = await supabaseRest.select('freezone_settlement_invoice_items', `?select=*&invoice_id=eq.${inv.id}&order=line_no.asc`, localStorage.getItem('ssu_token')); printInvoice(inv, items || []); }
    catch (e) { toast({ title: 'Could not print invoice', description: e.message || 'Try again.' }); }
  }

  if (loading || !user) return null;
  if (!isAdmin) return <><Navbar /><main className="min-h-[60vh] grid place-items-center"><div className="text-center"><h1 className="text-2xl font-semibold">Admin access required</h1><p className="mt-2 text-slate-600">This settlement area is restricted to authorised admin roles.</p></div></main><Footer /></>;

  return <div><Navbar /><section className="hero-gradient grain"><div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 pb-10"><div className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-semibold">Admin • Free Zone Settlement</div><h1 className="mt-2 font-display text-4xl lg:text-5xl font-semibold text-slate-900">Agent commission & free-zone settlement</h1><p className="mt-3 text-slate-600 max-w-4xl">ANCFZ packages are priced from the live database. Commission is selected from the exact amounts in the supplied Agent Commission Structure PDF. Add-ons never receive guessed commission.</p><Button onClick={() => navigate('/admin')} variant="outline" className="mt-5 rounded-full">Back to Admin</Button></div></section>
  <main className="bg-white py-10"><div className="max-w-7xl mx-auto px-5 lg:px-8 space-y-7">
    <section className="grid lg:grid-cols-[1.15fr_.85fr] gap-7"><div className="card-elevated rounded-3xl p-7"><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Create invoice</div><div className="grid md:grid-cols-2 gap-4 mt-5"><div><label className="text-sm font-medium">Registered company *</label><Input className="mt-2" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" /></div><div><label className="text-sm font-medium">ANCFZ package *</label><select className="mt-2 w-full h-10 rounded-md border border-slate-300 px-3 bg-white" value={packageId} onChange={(e) => setPackageId(e.target.value)}><option value="">Select package</option>{packages.map((x) => <option key={x.id} value={x.id}>{x.package_name} — {money(x.base_price)}</option>)}</select></div><div><label className="text-sm font-medium">Customer email</label><Input className="mt-2" value={email} onChange={(e) => setEmail(e.target.value)} /></div><div><label className="text-sm font-medium">Customer phone</label><Input className="mt-2" value={phone} onChange={(e) => setPhone(e.target.value)} /></div></div>{pkg && <div className="mt-5 rounded-2xl bg-slate-50 border p-4 text-sm"><b>{pkg.package_name}</b><div className="text-slate-600 mt-1">{pkg.visa_count} visa(s) • {pkg.duration_years} year • {mapping?.[1]} • live package price {money(pkg.base_price)}</div></div>}<div className="mt-5"><label className="text-sm font-medium">Commission tier *</label><select disabled={!schedule} className="mt-2 w-full h-10 rounded-md border border-slate-300 px-3 bg-white disabled:bg-slate-100" value={tier} onChange={(e) => setTier(e.target.value)}><option value="">{schedule ? 'Select exact source tier' : 'Select package first'}</option>{tierOptions.map(([k,v]) => <option key={k} value={k}>{v.label} — {v.rate}%</option>)}</select>{schedule?.source_notes && <p className="mt-2 text-xs text-amber-700">{schedule.source_notes}</p>}</div><div className="mt-6"><div className="text-sm font-medium">ANCFZ add-ons</div><p className="text-xs text-slate-500 mt-1">Price-on-request items are not invoiceable. The supplied commission schedule does not specify commission for the Additional Visa add-on, so it is shown at gross price with zero commission.</p><div className="mt-3 space-y-2">{addons.map((a) => <div key={a.id} className="flex items-center justify-between gap-4 border-b py-2"><div><b className="text-sm">{a.addon_name}</b><div className="text-xs text-slate-500">{a.addon_category} • {a.price == null ? 'Price on request — blocked' : `${money(a.price)} • commission not specified`}</div></div>{a.price != null && <Input type="number" min="0" step="1" className="w-24" value={addonQty[a.id] || ''} onChange={(e) => setAddonQty((p) => ({ ...p, [a.id]: Math.max(0, Number(e.target.value || 0)) }))} placeholder="0" />}</div>)}</div></div><Button className="mt-7 rounded-full px-6" disabled={busy || dataBusy || !pkg || !schedule || !tier || !company.trim()} onClick={createSettlement}>{busy ? 'Creating…' : 'Create & print settlement invoice'}</Button></div>
    <div className="space-y-7"><div className="card-elevated rounded-3xl p-7"><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Settlement preview</div><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span>Company/FZ package price</span><b>{money(pkg?.base_price)}</b></div><div className="flex justify-between"><span>Add-ons</span><b>{money(addonsTotal)}</b></div><div className="flex justify-between"><span>Agent commission</span><b className="text-emerald-700">- {money(commission?.commission_amount)}</b></div><div className="border-t pt-4 flex justify-between text-lg"><span>Net payable to ANCFZ</span><b>{money(net)}</b></div></div>{commission && <div className="mt-5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900"><b>Source amount:</b> {money(commission.commission_amount)} • {commission.commission_rate}% • {commission.tier_label} • page {commission.source_page}</div>}</div><div className="card-elevated rounded-3xl p-7"><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Verified source rules</div><ul className="mt-4 list-disc pl-5 space-y-2 text-sm text-slate-600"><li>ANCFZ new registration PDF lists business licence, lease agreement, corporate documents and visa-package ICP services including E-Channel, establishment card, entry permit, status change if applicable, normal Ajman medical, residency visa and Emirates ID.</li><li>ANCFZ PAYG PDF states health insurance is mandatory during the visa process and excluded from the package.</li><li>Agent Commission PDF page 2 states AED 500 commission per completed upgrade request.</li><li>Agent Commission PDF page 8 states new office commission is 50% of rental value per company, full-floor maximum capped at 10% of rental value (AED 100,000), and renewal is 35% of rental value.</li><li>Exact commission amounts are stored in Supabase with the source document SHA-256. Percentage is not used to overwrite a printed commission amount.</li></ul></div></div></section>
    <section className="card-elevated rounded-3xl p-7"><div className="flex justify-between items-center"><div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Settlement history</div><div className="mt-2 text-lg font-semibold">{invoices.length} invoices</div></div><Button variant="outline" className="rounded-full" onClick={loadData}>Reload</Button></div><div className="mt-5 overflow-x-auto"><table className="w-full text-sm min-w-[1050px]"><thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Invoice</th><th>Company</th><th>Service</th><th>Visas</th><th>Gross</th><th>Commission</th><th>Net to ANCFZ</th><th /></tr></thead><tbody>{invoices.map((i) => <tr key={i.id} className="border-b"><td className="py-3 font-mono">FZS-{String(i.invoice_no).padStart(6, '0')}</td><td>{i.company_name}</td><td>{i.service_request} / {i.pricing_mode}</td><td>{i.visa_count}</td><td>{money(Number(i.gross_package_amount) + Number(i.addons_total))}</td><td>{money(i.commission_amount)}</td><td>{money(i.net_payable_to_freezone)}</td><td><Button variant="outline" className="rounded-full h-9" onClick={() => printExisting(i)}>Print</Button></td></tr>)}{invoices.length === 0 && <tr><td colSpan="8" className="py-8 text-center text-slate-500">No settlement invoices yet.</td></tr>}</tbody></table></div></section>
  </div></main><Footer /></div>;
}
