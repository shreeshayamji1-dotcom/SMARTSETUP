import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { loadCheckoutPricing, getVisaPrice } from '../lib/checkoutSupabase';
import { Calculator, Sparkles, CheckCircle2, ChevronRight, Phone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function CostCalculator() {
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [addonOptions, setAddonOptions] = useState([]);
  const [zoneId, setZoneId] = useState('');
  const [visas, setVisas] = useState(1);
  const [addons, setAddons] = useState({});
  const [pricingError, setPricingError] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadCheckoutPricing()
      .then((pricing) => {
        if (cancelled) return;
        setZones(pricing.zones);
        setAddonOptions(pricing.addons || []);
        setZoneId((current) => current || pricing.zones[0]?.selection_id || pricing.zones[0]?.id || '');
        setPricingError('');
      })
      .catch((error) => {
        if (!cancelled) setPricingError(error.message || 'Live pricing could not be loaded from Supabase.');
      });
    return () => { cancelled = true; };
  }, []);

  const zone = zones.find((z) => (z.selection_id || z.id) === zoneId) || null;

  const breakdown = useMemo(() => {
    const items = [
      { l: `${zone?.name || 'Selected package'} — Trade Licence (Year 1)`, v: zone?.gov || 0, type: 'gov' },
    ];
    if (visas > 0) items.push({ l: `Investor visa setup x ${visas}`, v: getVisaPrice() * visas, type: 'gov' });
    items.push({ l: 'SmartSetupUAE service & advisory', v: zone?.svc || 0, type: 'svc' });
    Object.entries(addons).forEach(([id, count]) => {
      if (count > 0) {
        const a = addonOptions.find((x) => x.id === id);
        if (a) items.push({ l: `${a.label} x ${count}`, v: a.price * count, type: 'addon' });
      }
    });
    const total = items.reduce((s, x) => s + x.v, 0);
    return { items, total };
  }, [zone, visas, addons, addonOptions]);

  const toggleAddon = (id, delta) => {
    setAddons((a) => {
      const next = Math.max(0, (a[id] || 0) + delta);
      return { ...a, [id]: next };
    });
  };

  return (
    <div>
      <Navbar />
      <section className="hero-gradient grain">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-10 lg:pt-14 pb-10">
          <div className="flex items-center gap-2 fade-up"><Sparkles className="h-4 w-4 brand-bronze" /><span className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Cost Calculator</span></div>
          <h1 className="mt-4 font-display text-5xl lg:text-6xl font-semibold leading-[1.02] text-slate-900 fade-up delay-100">Estimate your<br /><span className="shine-text">true UAE setup cost.</span></h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl fade-up delay-200">Live calculator connected to Supabase pricing tables. No hidden costs.</p>
        </div>
      </section>

      <section className="pb-24 bg-[#FFFCF5]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 grid lg:grid-cols-12 gap-8">
          {/* LEFT PANEL */}
          <div className="lg:col-span-7 space-y-6">
            <div className="card-elevated rounded-2xl p-7">
              <div className="flex items-center gap-2"><Calculator className="h-4 w-4 brand-emerald" /><div className="text-[10px] uppercase tracking-[0.22em] font-semibold brand-emerald">Step 1</div></div>
              <h3 className="font-display text-2xl font-semibold mt-2 text-slate-900">Choose your jurisdiction</h3>
              {pricingError ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{pricingError}</div>
              ) : (
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger className="mt-4 h-12 rounded-lg"><SelectValue placeholder="Loading live pricing…" /></SelectTrigger>
                  <SelectContent>{zones.map((z) => (<SelectItem key={z.selection_id || z.id} value={z.selection_id || z.id}>{z.name}{z.package_name ? ` · ${z.package_name}` : ''} · AED {(z.gov || 0).toLocaleString()}</SelectItem>))}</SelectContent>
                </Select>
              )}
            </div>
            <div className="card-elevated rounded-2xl p-7">
              <div className="flex items-center gap-2"><Calculator className="h-4 w-4 brand-emerald" /><div className="text-[10px] uppercase tracking-[0.22em] font-semibold brand-emerald">Step 2</div></div>
              <h3 className="font-display text-2xl font-semibold mt-2 text-slate-900">How many investor visas?</h3>
              <div className="mt-4 flex items-center gap-3">
                <button onClick={() => setVisas((v) => Math.max(0, v - 1))} className="h-11 w-11 rounded-full border border-slate-300 hover:border-emerald-900/30">−</button>
                <div className="font-display text-3xl font-bold w-14 text-center text-slate-900">{visas}</div>
                <button onClick={() => setVisas((v) => Math.min(5, v + 1))} className="h-11 w-11 rounded-full border border-slate-300 hover:border-emerald-900/30">+</button>
                <div className="text-sm text-slate-500 ml-2">Max 5 shown for {zone?.name || 'selected package'}</div>
              </div>
            </div>
            <div className="card-elevated rounded-2xl p-7">
              <div className="flex items-center gap-2"><Calculator className="h-4 w-4 brand-emerald" /><div className="text-[10px] uppercase tracking-[0.22em] font-semibold brand-emerald">Step 3</div></div>
              <h3 className="font-display text-2xl font-semibold mt-2 text-slate-900">Add-on services</h3>
              <div className="mt-5 grid md:grid-cols-2 gap-3">
                {addonOptions.filter((a) => !['extra_visa'].includes(a.id)).map((a) => {
                  const count = addons[a.id] || 0;
                  return (
                    <div key={a.id} className={`p-4 rounded-xl border transition-colors ${count > 0 ? 'border-emerald-700/30 bg-emerald-50' : 'border-slate-200'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 text-sm">{a.label}</div>
                          <div className="text-xs text-slate-500">AED {a.price.toLocaleString()} · {a.unit}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => toggleAddon(a.id, -1)} className="h-7 w-7 rounded-full border border-slate-300 text-sm hover:border-emerald-900/30">−</button>
                          <div className="w-5 text-center text-sm font-bold">{count}</div>
                          <button onClick={() => toggleAddon(a.id, 1)} className="h-7 w-7 rounded-full border border-slate-300 text-sm hover:border-emerald-900/30">+</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: SUMMARY */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 card-elevated rounded-2xl p-7">
              <div className="text-[10px] uppercase tracking-[0.22em] font-semibold brand-bronze">Your estimate</div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="font-display text-5xl font-bold text-slate-900">AED {breakdown.total.toLocaleString()}</div>
              </div>
              <div className="text-xs text-slate-500">Year 1 — indicative, subject to authority approvals</div>
              <div className="mt-5 space-y-2 max-h-80 overflow-y-auto pr-2">
                {breakdown.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 text-sm">
                    <div className="flex items-center gap-2 min-w-0"><CheckCircle2 className="h-3.5 w-3.5 brand-emerald shrink-0" /><span className="text-slate-700 truncate">{it.l}</span></div>
                    <div className="font-semibold text-slate-900 shrink-0">AED {it.v.toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-900/10">
                <div className="text-[11px] uppercase tracking-[0.22em] brand-emerald font-semibold">Pay deposit</div>
                <div className="flex items-baseline gap-2"><div className="font-display text-2xl font-bold text-slate-900">AED 999</div><div className="text-xs text-slate-600">refundable pre-booking</div></div>
              </div>
              <Button data-testid="calc-reserve-btn" disabled={!zone || !!pricingError} onClick={() => navigate('/checkout', { state: { order: {
                zone_slug: zone?.slug,
                zone_name: zone?.name,
                package_id: zone?.package_id || zone?.selection_id || null,
                package_name: zone?.package_name || zone?.name,
                mode: 'freezone',
                visa_count: Number(visas) || 0,
                office_type: 'Virtual Desk',
                addons: Object.entries(addons).filter(([,c]) => c > 0).flatMap(([id, c]) => {
                  const a = addonOptions.find((x) => x.id === id);
                  return a ? Array.from({ length: c }, () => ({ id: a.id, label: a.label, price: a.price })) : [];
                }),
                total_aed: breakdown.total,
                contact: { name: '', email: '', phone: '' },
                business: { activity: '', company_names: ['', '', ''], shareholders: 1 },
              }}})} className="btn-primary rounded-full w-full h-12 mt-5">Get Started · AED {breakdown.total.toLocaleString()} <ChevronRight className="h-4 w-4 ml-1" /></Button>
              <Button onClick={() => navigate('/consultation')} variant="outline" className="rounded-full w-full h-11 mt-2 border-slate-300"><Phone className="h-4 w-4 mr-2" /> Talk to Advisor</Button>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
