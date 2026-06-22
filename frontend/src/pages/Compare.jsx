import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { ZONES } from '../data/zones';
import { loadFreezonePackages, mergeZonesWithLivePackages } from '../lib/pricingService';
import { Plus, X, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

const money = (n) => (n || n === 0 ? `AED ${Number(n).toLocaleString()}` : '—');

export default function Compare() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [livePackages, setLivePackages] = useState([]);

  useEffect(() => {
    let cancelled = false;
    loadFreezonePackages()
      .then((pkgs) => { if (!cancelled) setLivePackages(pkgs); })
      .catch(() => { if (!cancelled) setLivePackages([]); });
    return () => { cancelled = true; };
  }, []);

  const zones = useMemo(() => mergeZonesWithLivePackages(ZONES, livePackages), [livePackages]);

  const initialSlugs = useMemo(() => {
    const fromQuery = (params.get('zones') || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const matched = zones
      .filter((z) => fromQuery.includes(z.slug) || fromQuery.includes(z.name.toLowerCase()))
      .map((z) => z.slug);
    if (matched.length) return matched.slice(0, 4);
    return zones.slice(0, 3).map((z) => z.slug);
  }, [params, zones]);

  const [selected, setSelected] = useState([]);
  useEffect(() => { if (!selected.length && zones.length) setSelected(initialSlugs); }, [initialSlugs, zones, selected.length]);

  const selectedZones = selected.map((slug) => zones.find((z) => z.slug === slug)).filter(Boolean);
  const activity = params.get('activity');

  const addZone = (slug) => setSelected((s) => (s.includes(slug) || s.length >= 4 ? s : [...s, slug]));
  const removeZone = (slug) => setSelected((s) => s.filter((x) => x !== slug));

  const ROWS = [
    { label: 'Starting Cost', get: (z) => money(z.gov) + (z.priceSource === 'supabase' ? ' · live' : '') },
    { label: 'Government Fee', get: (z) => money(z.gov) },
    { label: 'Service Fee', get: (z) => money(z.svc) },
    { label: 'Included Activities', get: (z) => z.acts || '—' },
    { label: 'Max Visas', get: (z) => `${z.maxVis} visas` },
    { label: 'With 1 Visa (approx)', get: (z) => money(z.govVisa) },
    { label: 'Office Type', get: (z) => z.physical || '—' },
    { label: 'Processing Time', get: (z) => z.proc || '—' },
    { label: 'Ownership', get: (z) => `${z.ownership}%` },
    { label: 'Corporate Tax', get: (z) => (z.corpTax ? `${z.corpTax}%` : '0%') },
    { label: 'Renewal', get: (z) => z.renewal || '—' },
    { label: 'Best For', get: (z) => (z.best || []).slice(0, 3).join(', ') },
  ];

  const available = zones.filter((z) => !selected.includes(z.slug));

  return (
    <div data-testid="compare-page">
      <Navbar />
      <section className="hero-gradient grain">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 pb-10">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 brand-emerald" /><span className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Jurisdiction Comparison</span></div>
          <h1 className="mt-4 font-display text-4xl lg:text-6xl font-semibold text-slate-900">Compare UAE free zones side by side</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl">Pricing pulled live from our database. Compare up to 4 jurisdictions{activity ? <> for <span className="font-semibold">{activity}</span></> : ''}.</p>
        </div>
      </section>

      <section className="py-12 bg-[#FFFCF5]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          {available.length > 0 && selected.length < 4 && (
            <div className="mb-6 flex flex-wrap gap-2 items-center" data-testid="compare-add-row">
              <span className="text-sm text-slate-500 mr-1">Add a free zone:</span>
              {available.map((z) => (
                <button key={z.slug} onClick={() => addZone(z.slug)} className="text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-emerald-600 hover:brand-emerald transition-colors inline-flex items-center gap-1" data-testid={`compare-add-${z.slug}`}>
                  <Plus className="h-3 w-3" /> {z.name}
                </button>
              ))}
            </div>
          )}

          <div className="overflow-x-auto card-elevated rounded-3xl">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-[#0F2A2A] text-white">
                  <th className="text-left px-5 py-4 font-semibold w-48 sticky left-0 bg-[#0F2A2A]">Feature</th>
                  {selectedZones.map((z) => (
                    <th key={z.slug} className="px-5 py-4 text-left min-w-[180px]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-display text-lg font-semibold">{z.name}</div>
                          <div className="text-[11px] text-[#9DB5B0]">{z.loc}</div>
                        </div>
                        <button onClick={() => removeZone(z.slug)} className="text-white/60 hover:text-white" data-testid={`compare-remove-${z.slug}`}><X className="h-4 w-4" /></button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr key={row.label} className={i % 2 ? 'bg-[#F8F3E8]/50' : 'bg-white'}>
                    <td className="px-5 py-3.5 font-medium text-slate-700 sticky left-0 bg-inherit">{row.label}</td>
                    {selectedZones.map((z) => (
                      <td key={z.slug} className="px-5 py-3.5 text-slate-800">{row.get(z)}</td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-white">
                  <td className="px-5 py-4 sticky left-0 bg-white" />
                  {selectedZones.map((z) => (
                    <td key={z.slug} className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <Button onClick={() => navigate('/checkout', { state: { order: { zone_slug: z.slug, zone_name: z.name, package_id: z.livePackage?.package_id || null, package_name: z.livePackage?.package_name || z.name, total_aed: z.gov, visa_count: 0, addons: [], contact: { name: '', email: '', phone: '' }, business: { activity: activity || '', company_names: ['', '', ''], shareholders: 1 } } } })} className="btn-primary rounded-full h-9 text-xs" data-testid={`compare-start-${z.slug}`}>Start Application <ArrowRight className="h-3 w-3 ml-1" /></Button>
                        <Button variant="outline" onClick={() => navigate(`/free-zones/${z.slug}`)} className="rounded-full h-9 text-xs border-slate-300" data-testid={`compare-view-${z.slug}`}>View Packages</Button>
                        <Button variant="outline" onClick={() => navigate(`/consultation?service=${encodeURIComponent(z.name)}`)} className="rounded-full h-9 text-xs border-slate-300">Request Quote</Button>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {selectedZones.length === 0 && (
            <div className="mt-6 text-center text-slate-500">Add free zones above to start comparing.</div>
          )}

          <div className="mt-8 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-sm text-emerald-900 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> Prices marked “live” are read directly from our pricing database. Some jurisdictions are still under pricing verification — request a quotation for those.
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
