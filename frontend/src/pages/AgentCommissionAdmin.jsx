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
const FZ = 'ANCFZ';
const SOURCE_DOC = 'Agent Commission Structure V3 (1) (1) (1).pdf';
const SOURCE_SHA = '907bfaff7333b6776eb6811fa4c20c7827f6531e0318ccced0915604cbe909c9';

function packageMapping(pkg) {
  const name = String(pkg?.package_name || '');
  if (/^New Registration Upfront Discount/i.test(name)) return { service: 'new_registration', mode: 'full_advance' };
  if (/^All Inclusive Installment Available/i.test(name)) return { service: 'new_registration', mode: 'installment' };
  if (/^Pay As You Go - /i.test(name)) return { service: 'new_registration', mode: 'payg' };
  if (/^Renewal Upfront Discount/i.test(name)) return { service: 'renewal', mode: 'full_advance' };
  if (/^Renewal All Inclusive Installment Available/i.test(name)) return { service: 'renewal', mode: 'installment' };
  if (/^Pay As You Go Renewal/i.test(name)) return { service: 'renewal', mode: 'payg' };
  return null;
}

function money(value) {
  return `AED ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function printSettlement(invoice, items) {
  const lines = (items || []).map((item) => `
    <tr>
      <td>${String(item.description || '').replace(/</g, '&lt;')}</td>
      <td>${Number(item.quantity || 0).toLocaleString()}</td>
      <td>${money(item.unit_price)}</td>
      <td>${money(item.gross_amount)}</td>
      <td>${money(item.commission_amount)}</td>
      <td>${money(item.net_payable)}</td>
    </tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>FZS-${String(invoice.invoice_no).padStart(6, '0')}</title><style>
    @page{size:A4;margin:16mm}body{font-family:Arial,sans-serif;color:#172033;font-size:12px}h1{margin:0;font-size:24px}h2{font-size:15px;margin:24px 0 8px}.muted{color:#64748b}.brand{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#475569;font-weight:700}.top{display:flex;justify-content:space-between;border-bottom:2px solid #172033;padding-bottom:14px}.box{border:1px solid #dbe2ea;border-radius:8px;padding:12px;margin-top:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.summary{margin-left:auto;width:360px;margin-top:18px}.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eef2f7}.total{font-size:15px;font-weight:700;border-bottom:0;padding-top:12px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border-bottom:1px solid #e5e7eb;padding:9px;text-align:left}th{background:#f1f5f9;font-size:10px;text-transform:uppercase}footer{margin-top:35px;font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px}</style></head><body>
    <div class="top"><div><div class="brand">SmartSetupUAE.ae</div><h1>Free Zone Settlement Invoice</h1><div class="muted">Agent commission settlement document</div></div><div><b>FZS-${String(invoice.invoice_no).padStart(6, '0')}</b><br><span class="muted">${new Date(invoice.created_at).toLocaleDateString()}</span></div></div>
    <div class="grid"><div class="box"><b>Prepared by</b><br>Axiscrest-Global FZE LLC<br>SmartSetupUAE.ae</div><div class="box"><b>Payable to</b><br>Ajman NuVentures Centre Free Zone (ANCFZ)<br>Amber Gem Tower, Mezzanine Floor, Sheikh Khalifa Street, P.O Box 4848, Ajman, United Arab Emirates</div></div>
    <div class="box"><b>Registered company</b><br>${String(invoice.company_name || '').replace(/</g, '&lt;')}<br><span class="muted">Service: ${invoice.service_request} | Mode: ${invoice.pricing_mode} | Duration: ${invoice.duration_years || '-'} year(s) | Visas: ${invoice.visa_count}</span></div>
    <h2>Settlement lines</h2><table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Company/FZ Price</th><th>Our Commission</th><th>Net Payable</th></tr></thead><tbody>${lines}</tbody></table>
    <div class="summary"><div class="row"><span>Company/FZ package price</span><b>${money(invoice.gross_package_amount)}</b></div><div class="row"><span>Add-ons</span><b>${money(invoice.addons_total)}</b></div><div class="row"><span>Agent commission (${invoice.commission_rate ? `${invoice.commission_rate}%` : 'source amount'})</span><b>- ${money(invoice.commission_amount)}</b></div><div class="row total"><span>Amount payable to ANCFZ</span><span>${money(invoice.net_payable_to_freezone)}</span></div></div>
    <div class="box"><b>Commission source</b><br>${SOURCE_DOC}, Annexure-1 page ${invoice.source_snapshot?.commission_schedule?.source_page || '-'}<br><span class="muted">SHA-256: ${SOURCE_SHA}</span><br><span class="muted">Commission values are taken from the supplied commission schedule; they are not recalculated from percentage where an exact amount is printed.</span></div>
    <footer>Internal/free-zone settlement document. It records the published/free-zone package value, applicable agent commission, and net settlement. It is not a customer tax invoice.</footer>
    </body></html>`;
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}

export default function AgentCommissionAdmin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [packages, setPackages] = useState([]);
  const [addons, setAddons] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [itemsByInvoice, setItemsByInvoice] = useState({});
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [packageId, setPackageId] = useState('');
  const [tier, setTier] = useState('');
  const [selectedAddons, setSelectedAddons] = useState({});
  const [loadingData, setLoadingData] = useState(true);
  const [creating, setCreating] = useState(false);
  const [commissionPreview, setCommissionPreview] = useState(null);

  const isAdmin = ADMIN_ROLES.includes(user?.role);

  const selectedPackage = useMemo(() => packages.find((p) => p.id === packageId) || null, [packages, packageId]);
  const mapping = useMemo(() => packageMapping(selectedPackage), [selectedPackage]);
  const selectedSchedule = useMemo(() => schedules.find((s) => s.service_request === mapping?.service && s.pricing_mode === mapping?.mode && Number(s.duration_years || 0) === Number(selectedPackage?.duration_years || 0)) || null, [schedules, mapping, selectedPackage]);
  const tierOptions = useMemo(() => {
    if (!selectedSchedule?.tier_matrix) return [];
    return Object.entries(selectedSchedule.tier_matrix).sort(([a], [b]) => Number(a) - Number(b));
  }, [selectedSchedule]);
  const selectedAddonRows = useMemo(() => addons.filter((a) => selectedAddons[a.id]), [addons, selectedAddons]);
  const addonTotal = selectedAddonRows.reduce((sum, a) => sum + Number(a.price || 0) * Number(selectedAddons[a.id] || 1), 0);
  const gross = Number(selectedPackage?.base_price || 0) + addonTotal;
  const commission = Number(commissionPreview?.commission_amount || 0);
  const net = Math.max(0, gross - commission);

  async function loadAll() {
    setLoadingData(true);
    const token = localStorage.getItem('ssu_token');
    try {
      const [pkgRows, addonRows, scheduleRows, invoiceRows] = await Promise.all([
        supabaseRest.select('freezone_packages', '?select=id,freezone,package_name,package_type,duration_years,visa_count,base_price,currency&freezone=eq.ANCFZ&is_active=eq.true&order=package_name.asc', token),
        supabaseRest.select('package_addons', '?select=id,addon_name,addon_category,price,currency,notes&freezone=eq.ANCFZ&is_active=eq.true&order=addon_category.asc,addon_name.asc', token),
        supabaseRest.select('agent_commission_schedules', '?select=id,freezone,service_request,pricing_mode,duration_years,commission_type,fixed_commission,tier_matrix,source_document,source_page,source_sha256,source_notes&freezone=eq.ANCFZ&is_active=eq.true&order=service_request.asc,pricing_mode.asc,duration_years.asc', token),
        supabaseRest.select('freezone_settlement_invoices', '?select=*&order=created_at.desc&limit=50', token),
      ]);
      setPackages(pkgRows || []);
      setAddons(addonRows || []);
      setSchedules(scheduleRows || []);
      setInvoices(invoiceRows || []);
    } catch (e) {
      toast({ title: 'Commission data could not load', description: e.message || 'Check the admin role and Supabase migration.' });
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (!loading && !user) navigate('/login?redirect=/admin/commission');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user && isAdmin) loadAll();
  }, [user, isAdmin]);

  useEffect(() => {
    setTier('');
    setCommissionPreview(null);
  }, [selectedSchedule?.id]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!selectedSchedule || !tier || selectedPackage == null) return;
      try {
        const token = localStorage.getItem('ssu_token');
        const result = await supabaseRest.rpc('calculate_agent_commission', { p_schedule_id: selectedSchedule.id, p_tier_key: tier, p_visa_count: Number(selectedPackage.visa_count || 0) }, token);
        if (!cancelled) setCommissionPreview(result);
      } catch (e) {
        if (!cancelled) setCommissionPreview(null);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [selectedSchedule, tier, selectedPackage]);

  const createInvoice = async () => {
    if (!selectedPackage || !selectedSchedule || !tier || !companyName.trim()) {
      toast({ title: 'Complete the settlement fields', description: 'Select a package, commission tier and enter the registered company name.' });
      return;
    }
    setCreating(true);
    try {
      const token = localStorage.getItem('ssu_token');
      const payload = Object.entries(selectedAddons).filter(([, qty]) => Number(qty) > 0).map(([id, quantity]) => ({ id, quantity: Number(quantity) }));
      const result = await supabaseRest.rpc('create_freezone_settlement_invoice', {
        p_package_id: selectedPackage.id,
        p_schedule_id: selectedSchedule.id,
        p_tier_key: tier,
        p_company_name: companyName,
        p_customer_email: email,
        p_customer_phone: phone,
        p_addons: payload,
        p_order_id: null,
        p_notes: 'Generated from source-controlled ANCFZ agent commission schedule.',
      }, token);
      toast({ title: `Settlement FZS-${String(result.invoice_no).padStart(6, '0')} created`, description: `${money(result.net_payable_to_freezone)} payable to ANCFZ after ${money(result.commission_amount)} commission.` });
      const invoice = (await supabaseRest.select('freezone_settlement_invoices', `?select=*&id=eq.${result.invoice_id}`, token))[0];
      const items = await supabaseRest.select('freezone_settlement_invoice_items', `?select=*&invoice_id=eq.${result.invoice_id}&order=line_no.asc`, token);
      setItemsByInvoice((prev) => ({ ...prev, [result.invoice_id]: items || [] }));
      await loadAll();
      if (invoice) printSettlement(invoice, items || []);
    } catch (e) {
      toast({ title: 'Settlement invoice not created', description: e.message || 'Check the selected package and commission rule.' });
    } finally {
      setCreating(false);
    }
  };

  const printExisting = async (invoice) => {
    try {
      const token = localStorage.getItem('ssu_token');
      const items = itemsByInvoice[invoice.id] || await supabaseRest.select('freezone_settlement_invoice_items', `?select=*&invoice_id=eq.${invoice.id}&order=line_no.asc`, token);
      setItemsByInvoice((prev) => ({ ...prev, [invoice.id]: items || [] }));
      printSettlement(invoice, items || []);
    } catch (e) {
      toast({ title: 'Could not load invoice lines', description: e.message || 'Try again.' });
    }
  };

  if (loading || !user) return null;
  if (!isAdmin) return <><Navbar /><main className="min-h-[60vh] grid place-items-center px-6"><div className="text-center"><h1 className="text-2xl font-semibold">Admin access required</h1><p className="mt-2 text-slate-600">This settlement area is restricted to authorised admin roles.</p></div></main><Footer /></>;

  return (
    <div>
      <Navbar />
      <section className="hero-gradient grain"><div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 pb-10"><div className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-semibold">Admin • Free Zone Settlement</div><h1 className="mt-2 font-display text-4xl lg:text-5xl font-semibold text-slate-900">Agent commission & ANCFZ settlement invoices</h1><p className="mt-3 text-slate-600 max-w-4xl">The admin uses the exact commission amounts from the supplied Agent Commission Structure PDF and the live ANCFZ package/add-on database. No commission is inferred for an add-on unless the supplied commission schedule explicitly covers it.</p><div className="mt-5 flex flex-wrap gap-3"><Button onClick={() => navigate('/admin')} variant="outline" className="rounded-full">Back to Admin</Button><Button onClick={loadAll} variant="outline" className="rounded-full">Reload source data</Button></div></div></section>

      <main className="bg-white py-10"><div className="max-w-7xl mx-auto px-5 lg:px-8 space-y-7">
        <section className="grid lg:grid-cols-[1.15fr_.85fr] gap-7">
          <div className="card-elevated rounded-3xl p-7">
            <div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Create settlement invoice</div>
            <div className="grid md:grid-cols-2 gap-4 mt-5"><div><label className="text-sm font-medium">Registered company *</label><Input className="mt-2" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company registered in ANCFZ" /></div><div><label className="text-sm font-medium">Customer email</label><Input className="mt-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" /></div><div><label className="text-sm font-medium">Customer phone</label><Input className="mt-2" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" /></div><div><label className="text-sm font-medium">ANCFZ package *</label><select className="mt-2 w-full h-10 rounded-md border border-slate-300 px-3 bg-white" value={packageId} onChange={(e) => setPackageId(e.target.value)}><option value="">Select package</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.package_name} — {money(p.base_price)}</option>)}</select></div></div>
            {selectedPackage && <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"><b>{selectedPackage.package_name}</b><div className="mt-1 text-slate-600">{selectedPackage.visa_count} visa(s) • {selectedPackage.duration_years} year • {mapping?.mode || 'unmapped'} • source price {money(selectedPackage.base_price)}</div></div>}
            <div className="mt-5"><label className="text-sm font-medium">Agent commission tier *</label><select className="mt-2 w-full h-10 rounded-md border border-slate-300 px-3 bg-white disabled:bg-slate-100" disabled={!selectedSchedule} value={tier} onChange={(e) => setTier(e.target.value)}><option value="">{selectedSchedule ? 'Select exact commission tier' : 'Select a package first'}</option>{tierOptions.map(([key, data]) => <option key={key} value={key}>{data.label} — {data.rate}%</option>)}</select>{selectedSchedule?.source_notes && <p className="mt-2 text-xs text-amber-700">Source note: {selectedSchedule.source_notes}</p>}</div>
            <div className="mt-6"><div className="text-sm font-medium">Add-ons</div><p className="mt-1 text-xs text-slate-500">Only fixed-price active ANCFZ add-ons can be put on the settlement invoice. Price-on-request items are blocked. The supplied commission PDF does not state a commission for the Additional Visa add-on, so it is included at gross price with zero commission.</p><div className="mt-3 space-y-2">{addons.map((a) => <div key={a.id} className="flex items-center justify-between gap-4 border-b border-slate-100 py-2"><div><div className="text-sm font-medium">{a.addon_name}</div><div className="text-xs text-slate-500">{a.addon_category} • {a.price == null ? 'Price on request — not invoiceable' : `${money(a.price)} • commission not specified in supplied schedule`}</div></div>{a.price != null && <Input type="number" min="0" step="1" className="w-24" value={selectedAddons[a.id] || ''} onChange={(e) => setSelectedAddons((prev) => ({ ...prev, [a.id]: Math.max(0, Number(e.target.value || 0)) }))} placeholder="0" />}</div>)}</div></div>
            <Button className="mt-7 rounded-full px-6" disabled={creating || loadingData || !selectedPackage || !selectedSchedule || !tier || !companyName.trim()} onClick={createInvoice}>{creating ? 'Creating…' : 'Create & print settlement invoice'}</Button>
          </div>

          <div className="space-y-7">
            <div className="card-elevated rounded-3xl p-7"><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Settlement preview</div><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span>Company/FZ package price</span><b>{money(selectedPackage?.base_price)}</b></div><div className="flex justify-between"><span>Add-ons</span><b>{money(addonTotal)}</b></div><div className="flex justify-between"><span>Agent commission</span><b className="text-emerald-700">- {money(commission)}</b></div><div className="border-t pt-4 flex justify-between text-lg"><span>Net payable to ANCFZ</span><b>{money(net)}</b></div></div>{commissionPreview && <div className="mt-5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900"><b>Exact source value:</b> {money(commissionPreview.commission_amount)} at {commissionPreview.commission_rate}% — {commissionPreview.tier_label}. Source page {commissionPreview.source_page}.</div>}</div>
            <div className="card-elevated rounded-3xl p-7"><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Source-control notes</div><ul className="mt-4 space-y-3 text-sm text-slate-600 list-disc pl-5"><li>ANCFZ new package PDFs list Business License, lease, corporate documents and, for visa packages, investor security approval, E-Channel, establishment card, entry permit, status change if applicable, normal Ajman medical, residency visa and Emirates ID. fileciteturn17file1L6-L27</li><li>The ANCFZ PAYG PDF states health insurance is mandatory during the visa process and excluded from the package. fileciteturn17file0L14-L19</li><li>The agent commission PDF supplies exact commission amounts by visa count and volume tier; upgrade commission is AED 500 per completed upgrade request. fileciteturn17file2L40-L53</li><li>For PAYG, the PDF's renewal total row is arithmetically AED 500 below the sum of its printed line items; the admin therefore relies on the live ANCFZ package price for renewal rather than silently changing it. This is flagged, not guessed.</li><li>The 55% full-advance 1-visa commission is explicitly printed as AED 5,616 with a “Max 52%” note; the admin stores the printed amount, not 55% × package price. fileciteturn17file2L10-L18</li></ul></div>
          </div>
        </section>

        <section className="card-elevated rounded-3xl p-7"><div className="flex items-center justify-between gap-4 flex-wrap"><div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Settlement history</div><div className="mt-2 text-lg font-semibold">{invoices.length} invoices</div></div></div><div className="mt-5 overflow-x-auto"><table className="w-full text-sm min-w-[1050px]"><thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Invoice</th><th>Company</th><th>Package</th><th>Visas</th><th>Gross</th><th>Commission</th><th>Net to ANCFZ</th><th>Date</th><th /></tr></thead><tbody>{invoices.map((i) => <tr key={i.id} className="border-b border-slate-100"><td className="py-3 font-mono font-semibold">FZS-{String(i.invoice_no).padStart(6, '0')}</td><td>{i.company_name}</td><td>{i.pricing_mode} / {i.service_request}</td><td>{i.visa_count}</td><td>{money(Number(i.gross_package_amount) + Number(i.addons_total))}</td><td>{money(i.commission_amount)}</td><td>{money(i.net_payable_to_freezone)}</td><td>{new Date(i.created_at).toLocaleString()}</td><td><Button variant="outline" className="rounded-full h-9" onClick={() => printExisting(i)}>Print</Button></td></tr>)}{invoices.length === 0 && <tr><td colSpan="9" className="py-8 text-center text-slate-500">No settlement invoices yet.</td></tr>}</tbody></table></div></section>
      </div></main><Footer />
    </div>
  );
}
