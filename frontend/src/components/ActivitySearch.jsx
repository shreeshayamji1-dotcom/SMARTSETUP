import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Database, Loader2, CheckCircle2, AlertCircle, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { supabaseRest } from '../lib/supabaseRest';

const FREEZONE_OPTIONS = ['All', 'Mainland', 'ANCFZ', 'DAFZA', 'DMCC', 'IFZA', 'JAFZA', 'KIZAD', 'Meydan', 'RAKEZ', 'SHAMS', 'SPC'];

const FALLBACK_ACTIVITIES = [
  { id: 'fallback-1', freezone: 'Mainland', activity_name: 'Management Consultancy', activity_code: '7020.00', industry_group: 'Consulting', keywords: 'consulting business advisory management' },
  { id: 'fallback-2', freezone: 'Mainland', activity_name: 'Software Development', activity_code: '6201.00', industry_group: 'Technology', keywords: 'software app web development IT' },
  { id: 'fallback-3', freezone: 'SPC', activity_name: 'Online Marketing Services', activity_code: '7310.14', industry_group: 'Publishing & Media', keywords: 'marketing digital advertising media' },
  { id: 'fallback-4', freezone: 'RAKEZ', activity_name: 'General Trading', activity_code: '4690.00', industry_group: 'Trading', keywords: 'import export ecommerce wholesale' },
  { id: 'fallback-5', freezone: 'Meydan', activity_name: 'Portal and E-commerce Activities', activity_code: '6312.00', industry_group: 'Technology', keywords: 'ecommerce portal online marketplace' },
];

function normalise(row) {
  return {
    id: row.id || `${row.freezone}-${row.activity_code}-${row.activity_name}`,
    freezone: row.freezone || row.jurisdiction || 'Mainland',
    activity_name: row.activity_name || row.name || row.activity || '-',
    activity_code: row.activity_code || row.code || '-',
    industry_group: row.industry_group || row.group || '-',
    keywords: row.keywords || '',
    is_active: row.is_active !== false,
  };
}

export default function ActivitySearch({ compact = false }) {
  const [query, setQuery] = useState('');
  const [freezone, setFreezone] = useState('All');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usedFallback, setUsedFallback] = useState(false);

  const loadActivities = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const filters = [];
      filters.push('is_active=eq.true');
      if (freezone !== 'All') filters.push(`freezone=ilike.*${encodeURIComponent(freezone)}*`);
      if (query.trim()) {
        const q = encodeURIComponent(`*${query.trim()}*`);
        filters.push(`or=(activity_name.ilike.${q},activity_code.ilike.${q},industry_group.ilike.${q},keywords.ilike.${q})`);
      }
      const queryString = `?select=id,freezone,activity_name,activity_code,industry_group,keywords,is_active&${filters.join('&')}&order=freezone.asc&limit=${compact ? 12 : 500}`;
      const data = await supabaseRest.select('activities_master', queryString);
      setRows((data || []).map(normalise));
      setUsedFallback(false);
    } catch (e) {
      setError(e.message || 'Activity list could not load from Supabase.');
      setRows(FALLBACK_ACTIVITIES.map(normalise));
      setUsedFallback(true);
    } finally {
      setLoading(false);
    }
  }, [compact, freezone, query]);

  useEffect(() => { loadActivities({ silent: true }); }, [loadActivities]);

  const totals = useMemo(() => {
    const byZone = rows.reduce((acc, r) => ({ ...acc, [r.freezone]: (acc[r.freezone] || 0) + 1 }), {});
    return Object.entries(byZone).slice(0, 5);
  }, [rows]);

  return (
    <section className={`${compact ? 'py-12' : 'py-20'} bg-[#FFFCF5]`}>
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-900/10 text-[11px] uppercase tracking-[0.2em] font-semibold brand-emerald">
              <Database className="h-3.5 w-3.5" /> Supabase activity master
            </div>
            <h2 className="mt-4 font-display text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.05]">Search UAE business activities.</h2>
            <p className="mt-3 text-slate-600 leading-relaxed">Live activity search connected to your Supabase <b>activities_master</b> table for Mainland, SPC, RAKEZ, Meydan and other jurisdictions.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white border border-slate-200 p-4"><div className="text-2xl font-display font-bold text-slate-900">12,000+</div><div className="text-xs text-slate-500 mt-1">records supported</div></div>
              <div className="rounded-2xl bg-white border border-slate-200 p-4"><div className="text-2xl font-display font-bold text-slate-900">Live</div><div className="text-xs text-slate-500 mt-1">Supabase lookup</div></div>
            </div>
          </div>

          <div className="lg:col-span-8 card-elevated rounded-3xl p-5 lg:p-7">
            <div className="grid md:grid-cols-[1fr_190px_auto] gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') loadActivities(); }} placeholder="Search activity, code, keyword... e.g. software, media, trading" className="pl-10 h-11 rounded-xl" />
              </div>
              <Select value={freezone} onValueChange={setFreezone}>
                <SelectTrigger className="h-11 rounded-xl"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>{FREEZONE_OPTIONS.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={() => loadActivities()} disabled={loading} className="btn-primary rounded-xl h-11 px-6">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}</Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              {usedFallback ? <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-3 py-1 rounded-full"><AlertCircle className="h-3.5 w-3.5" /> Offline fallback shown</span> : <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full"><CheckCircle2 className="h-3.5 w-3.5" /> Supabase connected</span>}
              {totals.map(([z, c]) => <span key={z} className="px-3 py-1 rounded-full bg-slate-100 text-slate-600">{z}: {c}</span>)}
            </div>
            {error && <div className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-xl p-3">{error}</div>}

            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm min-w-[760px] bg-white">
                <thead className="bg-slate-50 text-slate-500"><tr><th className="text-left px-4 py-3">Jurisdiction</th><th className="text-left px-4 py-3">Activity</th><th className="text-left px-4 py-3">Code</th><th className="text-left px-4 py-3">Industry Group</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-emerald-50/40">
                      <td className="px-4 py-3 font-semibold brand-emerald">{r.freezone}</td>
                      <td className="px-4 py-3 text-slate-900">{r.activity_name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.activity_code}</td>
                      <td className="px-4 py-3 text-slate-600">{r.industry_group}</td>
                    </tr>
                  ))}
                  {!loading && rows.length === 0 && <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">No activity found. Try a broader keyword.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
