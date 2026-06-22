import React, { useEffect, useMemo, useState } from 'react';
import { Search, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ACTIVITY_SAMPLES } from '../mock';
import { buildRecommendation, captureAILead, searchActivities } from '../lib/activitySearchService';

const COUNTRY_CODES = ['+971', '+91', '+92', '+966', '+974', '+965', '+968', '+973', '+44', '+1', '+65'];
const COUNTRIES = ['United Arab Emirates', 'India', 'Pakistan', 'Bangladesh', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain', 'United Kingdom', 'United States', 'Singapore'];
const emptyLead = { name: '', email: '', countryCode: '+971', phone: '', whatsapp: '', nationality: '', residenceCountry: '' };

export default function AISearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [lead, setLead] = useState(emptyLead);
  const [savingLead, setSavingLead] = useState(false);
  const [leadError, setLeadError] = useState('');

  const countrySuggestions = useMemo(() => {
    const term = (lead.residenceCountry || '').toLowerCase().trim();
    if (!term) return [];
    return COUNTRIES.filter((c) => c.toLowerCase().includes(term) && c.toLowerCase() !== term).slice(0, 6);
  }, [lead.residenceCountry]);

  const nationalitySuggestions = useMemo(() => {
    const term = (lead.nationality || '').toLowerCase().trim();
    if (!term) return [];
    return COUNTRIES.filter((c) => c.toLowerCase().includes(term) && c.toLowerCase() !== term).slice(0, 6);
  }, [lead.nationality]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const rows = await searchActivities(term, { limit: 12 });
        setSuggestions(rows);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const runSearch = async (activityText) => {
    const term = activityText || q;
    if (!term) return;
    setQ(term);
    setLoading(true);
    setResult(null);
    setLeadOpen(false);
    try {
      const matches = await searchActivities(term, { limit: 1 });
      const activity = matches[0] || { activity_name: term, activity_code: '', freezone: 'Meydan FZ', industry_group: '' };
      setSelectedActivity(activity);
      setResult(buildRecommendation(activity));
      setSuggestions([]);
    } catch {
      const activity = { activity_name: term, activity_code: '', freezone: 'Meydan FZ', industry_group: '' };
      setSelectedActivity(activity);
      setResult(buildRecommendation(activity));
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const chooseActivity = (activity) => {
    setSelectedActivity(activity);
    setQ(activity.activity_name);
    setResult(buildRecommendation(activity));
    setSuggestions([]);
  };

  const goToCheckout = (leadId) => {
    const params = new URLSearchParams({
      source: 'ai-search',
      activity: result?.activity || selectedActivity?.activity_name || q,
      activity_code: result?.activityCode || '',
      freezone: result?.bestZone || '',
      name: lead.name || '',
      email: lead.email || '',
      phone_code: lead.countryCode || '+971',
      phone: lead.phone || lead.whatsapp || '',
      nationality: lead.nationality || '',
      residence_country: lead.residenceCountry || '',
    });
    if (leadId) params.set('lead_id', leadId);
    navigate(`/checkout?${params.toString()}`);
  };

  const submitLead = async (e) => {
    e.preventDefault();
    setLeadError('');
    if (!lead.name || !lead.email || !lead.phone || !lead.nationality || !lead.residenceCountry) {
      setLeadError('Please fill name, email, mobile/WhatsApp, nationality and country of residence.');
      return;
    }
    setSavingLead(true);
    try {
      const saved = await captureAILead(lead, result, 'ai_search_start_application');
      goToCheckout(saved?.id);
    } catch (err) {
      setLeadError(err.message || 'Could not save lead. Please check Supabase leads table/RLS.');
    } finally {
      setSavingLead(false);
    }
  };

  return (
    <section id="ai-search" className="py-24 lg:py-28 section-gradient-emerald">
      <div className="max-w-6xl mx-auto px-5 lg:px-8">
        <div className="text-center reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/5 border border-emerald-900/10">
            <Sparkles className="h-3.5 w-3.5 brand-emerald" />
            <span className="text-[11px] uppercase tracking-[0.22em] font-semibold brand-emerald">AI-Powered Activity Search</span>
          </div>
          <h2 className="mt-5 font-display text-4xl lg:text-6xl font-semibold text-slate-900 leading-[1.05]">Which free zone supports your activity?</h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">Type any business activity below — live Supabase activity search checks supported UAE free zone and mainland activity lists, then recommends the best setup option.</p>
        </div>

        <div className="mt-10 max-w-3xl mx-auto reveal">
          <div className="relative">
            <Search className="h-5 w-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && q && runSearch(q)} placeholder="e.g., Software Development, E-Commerce, Gold Trading…" className="h-16 pl-14 pr-36 text-base rounded-2xl border-slate-200 shadow-sm bg-white" />
            <Button onClick={() => q && runSearch(q)} className="btn-primary absolute right-2 top-1/2 -translate-y-1/2 rounded-xl h-12 px-5" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}</Button>
            {suggestions.length > 0 && (
              <div className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden text-left">
                {suggestions.map((s) => (
                  <button key={s.id} type="button" onClick={() => chooseActivity(s)} className="w-full px-5 py-3 text-left hover:bg-emerald-50 border-b border-slate-100 last:border-0">
                    <div className="font-semibold text-slate-900">{s.activity_name}</div>
                    <div className="text-xs text-slate-500">{s.activity_code || 'No code'} · {s.industry_group || 'General'} · {s.freezone}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {ACTIVITY_SAMPLES.slice(0, 7).map((a) => (<button key={a} onClick={() => runSearch(a)} className="text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-brand-emerald hover:brand-emerald transition-colors">{a}</button>))}
          </div>

          {loading && <div className="mt-8 text-center text-slate-600 text-sm flex items-center justify-center gap-2"><div className="h-2 w-2 rounded-full bg-brand-emerald animate-pulse" /><div className="h-2 w-2 rounded-full bg-brand-emerald animate-pulse" style={{ animationDelay: '150ms' }} /><div className="h-2 w-2 rounded-full bg-brand-emerald animate-pulse" style={{ animationDelay: '300ms' }} /><span className="ml-2">Analyzing activity …</span></div>}

          {result && !loading && (
            <div className="mt-8 card-elevated rounded-2xl p-7 fade-up">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div><div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-slate-500">Match Result</div><div className="font-display text-2xl font-semibold text-slate-900 mt-1">{result.activity}</div><div className="text-sm text-slate-500">Activity Code: <span className="font-mono">{result.activityCode || 'To be confirmed'}</span></div></div>
                <div className="text-right"><div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-slate-500">Match Score</div><div className="font-display text-3xl font-bold brand-emerald">{result.matchScore}%</div></div>
              </div>
              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-900/10"><div className="text-[11px] uppercase tracking-[0.2em] brand-emerald font-semibold">Best Recommendation</div><div className="font-display text-xl font-semibold text-slate-900 mt-1">{result.bestZone}</div><div className="text-sm text-slate-600 mt-1">Starting at <span className="font-semibold">{result.cost}</span> · {result.processingTime}</div></div>
                <div className="p-5 rounded-xl bg-amber-50 border border-amber-200/60"><div className="text-[11px] uppercase tracking-[0.2em] brand-bronze font-semibold">Alternatives</div><div className="mt-2 space-y-1">{result.alternatives.map((a) => (<div key={a} className="text-sm text-slate-700 flex items-center gap-2">• {a}</div>))}</div></div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => setLeadOpen(true)} className="btn-primary rounded-full px-6 h-11">Start Application <ArrowRight className="h-4 w-4 ml-2" /></Button>
                <Button variant="outline" onClick={() => navigate(`/compare?activity=${encodeURIComponent(result.activity)}&zones=${encodeURIComponent(result.bestZone || '')}`)} className="rounded-full px-6 h-11 border-slate-300">Get Full Comparison</Button>
                <Button variant="outline" onClick={() => setLeadOpen(true)} className="rounded-full px-6 h-11 border-slate-300">Book a Free Call</Button>
              </div>

              {leadOpen && (
                <form onSubmit={submitLead} className="mt-6 rounded-2xl border border-emerald-900/10 bg-white p-5 text-left">
                  <div className="text-[11px] uppercase tracking-[0.2em] brand-emerald font-semibold">Start Application</div>
                  <div className="mt-3 grid md:grid-cols-2 gap-3">
                    <Input value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} placeholder="Full name" className="h-11 rounded-xl" />
                    <Input type="email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} placeholder="Email address" className="h-11 rounded-xl" />
                    <div className="flex gap-2"><select value={lead.countryCode} onChange={(e) => setLead({ ...lead, countryCode: e.target.value })} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">{COUNTRY_CODES.map((c) => <option key={c} value={c}>{c}</option>)}</select><Input value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value, whatsapp: e.target.value })} placeholder="Mobile / WhatsApp" className="h-11 rounded-xl" /></div>
                    <div className="relative">
                      <Input value={lead.nationality} onChange={(e) => setLead({ ...lead, nationality: e.target.value })} placeholder="Nationality" className="h-11 rounded-xl" />
                      {nationalitySuggestions.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                          {nationalitySuggestions.map((c) => (
                            <button type="button" key={c} onClick={() => setLead((prev) => ({ ...prev, nationality: c }))} className="block w-full text-left px-4 py-2 text-sm hover:bg-emerald-50">{c}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative md:col-span-2">
                      <Input value={lead.residenceCountry} onChange={(e) => setLead({ ...lead, residenceCountry: e.target.value })} placeholder="Country of residence e.g. India, UAE, Pakistan" className="h-11 rounded-xl" />
                      {countrySuggestions.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                          {countrySuggestions.map((c) => (
                            <button type="button" key={c} onClick={() => setLead((prev) => ({ ...prev, residenceCountry: c }))} className="block w-full text-left px-4 py-2 text-sm hover:bg-emerald-50">{c}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {leadError && <div className="mt-3 text-sm text-red-600">{leadError}</div>}
                  <div className="mt-4 flex justify-end"><Button type="submit" disabled={savingLead} className="btn-primary rounded-full px-6 h-11">{savingLead ? 'Saving…' : 'Continue to Application'}</Button></div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
