import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { COMPANY_INFO } from '../data/zones';
import { createCheckoutOrder, loadCheckoutPricing, markBankTransferSubmitted, getPrebookingAmount, getVisaPrice, getDefaultServiceFee } from '../lib/checkoutSupabase';
import { searchActivities } from '../lib/activitySearchService';
import { CheckCircle2, ChevronLeft, ChevronRight, CreditCard, Landmark, Upload, ShieldCheck, Sparkles, Building2, FileText, Tag, X } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+971', label: 'AE +971' },
  { code: '+91', label: 'IN +91' },
  { code: '+92', label: 'PK +92' },
  { code: '+966', label: 'SA +966' },
  { code: '+974', label: 'QA +974' },
  { code: '+965', label: 'KW +965' },
  { code: '+968', label: 'OM +968' },
  { code: '+973', label: 'BH +973' },
  { code: '+44', label: 'UK +44' },
  { code: '+1', label: 'US +1' },
];

const COUPONS = [
  { code: 'FIRST500', label: '100% off SmartSetupUAE service fee', percent: 100, appliesTo: 'service' },
  { code: 'SMARTSAVE12', label: '12% scratch-card discount', percent: 12, appliesTo: 'package' },
  { code: 'FOUNDER5', label: '5% Founder Club discount', percent: 5, appliesTo: 'package' },
];

const STEPS = [
  { id: 1, label: 'Package' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'Payment' },
  { id: 4, label: 'Confirmed' },
];

function defaultDraft() {
  return {
    zone_slug: '',
    zone_name: '',
    mode: 'freezone',
    visa_count: 1,
    office_type: 'Virtual Desk',
    addons: [],
    package_id: null,
    package_name: '',
    total_aed: 0,
    contact: { name: '', email: '', phone_code: '+971', phone: '' },
    business: { activity: '', activities: [], company_names: ['', '', ''], shareholders: 1 },
  };
}

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [availableZones, setAvailableZones] = useState([]);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const [pricingError, setPricingError] = useState('');
  const [activitySuggestions, setActivitySuggestions] = useState([]);
  const [couponCode, setCouponCode] = useState(() => localStorage.getItem('ssu_scratch_coupon_code') || 'FIRST500');

  const incoming = location.state?.order;
  const [draft, setDraft] = useState(() => ({ ...defaultDraft(), ...(incoming || {}) }));
  const [step, setStep] = useState(1);
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [payTab, setPayTab] = useState('card'); // 'card' | 'bank'
  const [payChoice, setPayChoice] = useState('full'); // 'reserve' | 'full'
  const [activityQuery, setActivityQuery] = useState('');
  const [bankProof, setBankProof] = useState({ file_base64: '', file_name: '', content_type: '', amount_aed: getPrebookingAmount(), reference: '', payer_name: '' });

  // Prefill contact from auth
  useEffect(() => {
    if (user && !draft.contact.email) {
      const t = setTimeout(() => {
        setDraft((d) => ({ ...d, contact: { ...d.contact, name: user.name || user.full_name || '', email: user.email || '', phone: user.phone || '' } }));
      }, 0);
      return () => clearTimeout(t);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle cancelled return
  useEffect(() => {
    if (params.get('cancelled')) {
      const t = setTimeout(() => {
        toast({ title: 'Payment cancelled', description: 'You can try again or pay via bank transfer.' });
      }, 0);
      return () => clearTimeout(t);
    }
  }, [params, toast]);

  const isFounderClubMember = user?.role === 'founder';
  const scratchReward = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('ssu_scratch_coupon') || 'null'); } catch { return null; }
  }, []);
  const dynamicCoupons = useMemo(() => {
    const allowedCoupons = COUPONS.filter((coupon) => coupon.code !== 'FOUNDER5' || isFounderClubMember);
    if (!scratchReward?.code || allowedCoupons.some((coupon) => coupon.code === scratchReward.code)) return allowedCoupons;
    return [...allowedCoupons, { code: scratchReward.code, label: `${scratchReward.discount}% scratch-card discount`, percent: Number(scratchReward.discount) || 0, appliesTo: 'package' }];
  }, [scratchReward, isFounderClubMember]);
  const selectedCoupon = dynamicCoupons.find((coupon) => coupon.code === couponCode) || dynamicCoupons[0];

  useEffect(() => {
    const coupon = params.get('coupon')?.toUpperCase();
    if (coupon && dynamicCoupons.some((c) => c.code === coupon)) {
      setCouponCode(coupon);
    }
  }, [params, dynamicCoupons]);

  useEffect(() => {
    let cancelled = false;
    async function loadPricing() {
      try {
        const pricing = await loadCheckoutPricing();
        if (cancelled) return;
        setAvailableZones(pricing.zones);
        setAvailableAddons(pricing.addons);
        setPricingLoaded(true);
        setPricingError('');
      } catch (e) {
        if (cancelled) return;
        setPricingLoaded(false);
        setPricingError(e.message || 'Could not load live Supabase checkout pricing.');
        toast({ title: 'Could not load live pricing', description: e.message || 'Check Supabase checkout tables and policies.' });
      }
    }
    loadPricing();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (!availableZones.length) return;
    setDraft((d) => {
      const requestedFreezone = params.get('freezone');
      const selectedKey = d.package_id || requestedFreezone || d.zone_slug;
      const matched =
        availableZones.find((z) => String(z.package_id || z.selection_id || z.slug).toLowerCase() === String(selectedKey || '').toLowerCase()) ||
        availableZones.find((z) => String(z.name || '').toLowerCase().includes(String(requestedFreezone || '').toLowerCase())) ||
        availableZones[0];
      return {
        ...d,
        zone_slug: matched.slug,
        zone_name: matched.name,
        package_id: matched.package_id || matched.selection_id || null,
        package_name: matched.package_name || matched.name,
        contact: {
          ...d.contact,
          name: d.contact.name || params.get('name') || '',
          email: d.contact.email || params.get('email') || '',
          phone_code: d.contact.phone_code || params.get('phone_code') || '+971',
          phone: d.contact.phone || params.get('phone') || '',
        },
        business: {
          ...d.business,
          activity: d.business.activity || params.get('activity') || '',
        },
        addons: d.addons.map((a) => {
          const live = availableAddons.find((x) => x.id === a.id || x.addon_id === a.addon_id);
          return live ? { id: live.id, addon_id: live.addon_id, label: live.label, price: live.price } : a;
        }),
      };
    });
  }, [availableZones, availableAddons, params]);

  const zones = availableZones;
  const addonsData = availableAddons;
  const selectedPackageKey = draft.package_id || draft.zone_slug;
  const currentZone = zones.find((z) => (z.package_id || z.selection_id || z.slug) === selectedPackageKey) || zones[0] || null;
  const originalServiceFee = currentZone?.svc || getDefaultServiceFee();
  const serviceFeeAfterDiscount = selectedCoupon.appliesTo === 'service' ? 0 : originalServiceFee;
  const packageDiscount = selectedCoupon.appliesTo === 'package' ? Math.round((currentZone?.gov || 0) * (selectedCoupon.percent / 100)) : 0;

  const breakdown = useMemo(() => {
    const items = [
      { l: `${draft.zone_name || currentZone?.name || 'Selected package'} — Trade Licence (Year 1)`, v: currentZone?.gov || 0, type: 'zone', slug: currentZone?.slug },
      ...(draft.visa_count > 0 ? [{ l: `Investor visa x ${draft.visa_count}`, v: getVisaPrice() * draft.visa_count, type: 'visa', count: draft.visa_count }] : []),
      ...draft.addons.map((a) => ({ l: a.label, v: a.price, type: 'addon', id: a.id })),
      ...(packageDiscount > 0 ? [{ l: `${selectedCoupon.code} discount`, v: -packageDiscount, type: 'discount' }] : []),
      { l: 'SmartSetupUAE service & advisory', v: serviceFeeAfterDiscount, original: originalServiceFee, type: 'service' },
    ];
    const total = items.reduce((s, x) => s + x.v, 0);
    return { items, total };
  }, [draft, currentZone, packageDiscount, selectedCoupon, serviceFeeAfterDiscount, originalServiceFee]);

  const payAmount = payChoice === 'full' ? breakdown.total : getPrebookingAmount();
  const activityLimit = Number(currentZone?.activities_allowed || currentZone?.raw?.activities_allowed || 3);
  const selectedActivities = draft.business.activities || [];

  const addActivity = (name) => {
    setActivityQuery('');
    setActivitySuggestions([]);
    setDraft((d) => {
      const list = d.business.activities || [];
      if (list.includes(name)) return d;
      if (list.length >= activityLimit) {
        toast({ title: `Activity limit reached`, description: `This package allows ${activityLimit} activities. Upgrade your package to add more.` });
        return d;
      }
      const activities = [...list, name];
      return { ...d, business: { ...d.business, activities, activity: activities[0] } };
    });
  };

  const removeActivity = (name) => {
    setDraft((d) => {
      const activities = (d.business.activities || []).filter((a) => a !== name);
      return { ...d, business: { ...d.business, activities, activity: activities[0] || '' } };
    });
  };

  useEffect(() => {
    const term = activityQuery.trim();
    if (term.length < 2) {
      setActivitySuggestions([]);
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      try {
        setActivitySuggestions(await searchActivities(term, { limit: 8 }));
      } catch {
        setActivitySuggestions([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activityQuery]);

  // ----- Step 1 actions -----
  const upd = (path, value) => {
    setDraft((d) => {
      const next = { ...d };
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const next = async () => {
    if (step === 2) {
      const { name, email, phone } = draft.contact;
      if (!name || !email || !phone) return toast({ title: 'Add name, email and phone' });
      if (!draft.business.activities || draft.business.activities.length === 0) return toast({ title: 'Add at least one business activity' });
    }
    if (step === 2) {
      // Create the order now
      setBusy(true);
      try {
        const data = await createCheckoutOrder({ ...draft, total_aed: breakdown.total }, breakdown.total, user);
        setOrder(data);
        if (data?.claim_token) {
          try { sessionStorage.setItem(`ssu_order_${data.id}`, data.claim_token); } catch (_e) {}
        }
        setStep(3);
      } catch (e) {
        toast({ title: 'Could not create order', description: e.message || 'Please try again.' });
      } finally {
        setBusy(false);
      }
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  // ----- Stripe pay -----
  const payCard = async () => {
    if (!order) return;
    toast({
      title: 'Card payment not enabled yet',
      description: 'This build now saves the order in Supabase. Use bank transfer until a Stripe Edge Function is connected.',
    });
    setPayTab('bank');
  };

  // ----- Bank proof -----
  const onProofFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) return toast({ title: 'File too large (max 4MB)' });
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const b64 = result.split(',')[1] || '';
      setBankProof((p) => ({ ...p, file_base64: b64, file_name: f.name, content_type: f.type || 'application/octet-stream' }));
    };
    reader.readAsDataURL(f);
  };

  const submitBankProof = async () => {
    if (!order) return;
    if (!bankProof.file_base64) return toast({ title: 'Please attach the bank transfer receipt' });
    if (!bankProof.payer_name) return toast({ title: 'Add the payer name' });
    setBusy(true);
    try {
      const amount = payChoice === 'full' ? breakdown.total : getPrebookingAmount();
      await markBankTransferSubmitted(order, { ...bankProof, reference: order.reference, amount_aed: amount, payment_choice: payChoice });
      toast({ title: 'Proof received', description: 'We will verify within 24 hours.' });
      setStep(5);
    } catch (e) {
      toast({ title: 'Upload failed', description: e.message || 'Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const handleBreakdownClick = (item) => {
    if (item.type === 'zone' && item.slug) {
      const zone = zones.find((z) => z.slug === item.slug);
      if (zone) {
        setDraft((d) => ({ ...d, zone_slug: zone.slug, zone_name: zone.name }));
      }
      setStep(1);
      return;
    }

    if (item.type === 'addon' && item.id) {
      const addon = addonsData.find((a) => a.id === item.id);
      if (!addon) return;
      setDraft((d) => {
        const has = d.addons.some((x) => x.id === addon.id);
        return {
          ...d,
          addons: has
            ? d.addons.filter((x) => x.id !== addon.id)
            : [...d.addons, { id: addon.id, label: addon.label, price: addon.price }],
        };
      });
      setStep(1);
      return;
    }

    if (item.type === 'visa') {
      setStep(1);
      return;
    }

    if (item.type === 'service') {
      return;
    }
  };

  return (
    <div>
      <Navbar />
      <section className="hero-gradient grain">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 pt-10 pb-6">
          <div className="flex items-center gap-2 fade-up"><Sparkles className="h-4 w-4 brand-bronze" /><span className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Secure Checkout</span></div>
          <h1 className="mt-3 font-display text-4xl lg:text-5xl font-semibold leading-[1.02] text-slate-900 fade-up delay-100">Simple setup<br /><span className="shine-text">in just three steps.</span></h1>

          {/* Stepper */}
          <div className="mt-8 flex items-center gap-2 lg:gap-4 fade-up delay-200" data-testid="checkout-stepper">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className={`flex items-center gap-2 ${s.id <= step ? 'opacity-100' : 'opacity-50'}`}>
                  <div className={`h-9 w-9 rounded-full grid place-items-center text-sm font-bold ${s.id < step ? 'bg-brand-emerald text-white' : s.id === step ? 'bg-amber-100 brand-bronze ring-2 ring-amber-300' : 'bg-white border border-slate-200 text-slate-500'}`}>
                    {s.id < step ? <CheckCircle2 className="h-4 w-4" /> : s.id}
                  </div>
                  <div className="hidden sm:block text-xs font-semibold text-slate-700">{s.label}</div>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px ${s.id < step ? 'bg-brand-emerald' : 'bg-slate-200'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 py-10 grid lg:grid-cols-3 gap-8">
          {/* MAIN */}
          <div className="lg:col-span-2 card-elevated rounded-3xl p-7 lg:p-9" data-testid="checkout-main">
            {!pricingLoaded && !pricingError && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">Loading live Supabase checkout pricing…</div>
            )}
            {pricingError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{pricingError}</div>
            )}

            {pricingLoaded && (<>
            {/* Step 1 — Package review */}
            {step === 1 && (
              <div className="space-y-5 fade-up" data-testid="step-1">
                <div className="flex items-center gap-2 text-brand-emerald font-semibold"><Building2 className="h-4 w-4" /> Select your package</div>
                
                {/* Simplified Package Selection */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Freezone or Jurisdiction</label>
                  <Select value={selectedPackageKey} onValueChange={(key) => {
                    const z = zones.find((x) => (x.package_id || x.selection_id || x.slug) === key);
                    if (z) setDraft((d) => ({ ...d, zone_slug: z.slug, zone_name: z.name, package_id: z.package_id || null, package_name: z.package_name || z.name }));
                  }}>
                    <SelectTrigger className="mt-1 h-11 rounded-lg" data-testid="step-1-zone-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {zones.map((z) => (
                        <SelectItem key={z.package_id || z.selection_id || z.slug} value={z.package_id || z.selection_id || z.slug}>{z.name}{z.package_name ? ` — ${z.package_name}` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Options */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Visas</label>
                    <Select value={String(draft.visa_count)} onValueChange={(v) => upd('visa_count', Number(v))}>
                      <SelectTrigger className="mt-1 h-11 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{[0,1,2,3,4,5].map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Office Space</label>
                    <Select value={draft.office_type} onValueChange={(v) => upd('office_type', v)}>
                      <SelectTrigger className="mt-1 h-11 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{['Virtual Desk','Flexi Desk','Private Office'].map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Coupon</label>
                    <Select value={couponCode} onValueChange={setCouponCode}>
                      <SelectTrigger className="mt-1 h-11 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{dynamicCoupons.map((coupon) => <SelectItem key={coupon.code} value={coupon.code}>{coupon.code}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Add-ons */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 block mb-3">Optional Services (Click to Add)</label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {addonsData.slice(0, 4).map((a) => {
                      const checked = draft.addons.some((x) => x.id === a.id);
                      return (
                        <label key={a.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm transition ${checked ? 'border-emerald-500 bg-emerald-50 font-medium' : 'border-slate-300 bg-white hover:border-emerald-300'}`}>
                          <input type="checkbox" checked={checked} onChange={(e) => {
                            setDraft((d) => ({
                              ...d,
                              addons: e.target.checked
                                ? [...d.addons, { id: a.id, label: a.label, price: a.price }]
                                : d.addons.filter((x) => x.id !== a.id),
                            }));
                          }} className="accent-emerald-600" />
                          <div className="flex-1">
                            <div className="font-medium text-slate-800">{a.label}</div>
                            <div className="text-xs text-slate-500">AED {a.price.toLocaleString()}/yr</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — Contact & Business Details */}
            {step === 2 && (
              <div className="space-y-6 fade-up" data-testid="step-2">
                {/* Contact Section */}
                <div>
                  <div className="flex items-center gap-2 text-brand-emerald font-semibold mb-4"><ShieldCheck className="h-4 w-4" /> Your Information</div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Full Name</label>
                      <Input data-testid="contact-name" value={draft.contact.name} onChange={(e) => upd('contact.name', e.target.value)} className="mt-1 h-11 rounded-lg" placeholder="Your name" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Email</label>
                      <Input data-testid="contact-email" type="email" value={draft.contact.email} onChange={(e) => upd('contact.email', e.target.value)} className="mt-1 h-11 rounded-lg" placeholder="you@company.com" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Phone / WhatsApp</label>
                      <div className="mt-1 grid grid-cols-[100px_1fr] gap-2">
                        <Select value={draft.contact.phone_code || '+971'} onValueChange={(v) => upd('contact.phone_code', v)}>
                          <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>{COUNTRY_CODES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input data-testid="contact-phone" value={draft.contact.phone} onChange={(e) => upd('contact.phone', e.target.value.replace(/[^0-9 ]/g, ''))} className="h-11 rounded-lg" placeholder="50 123 4567" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Section */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-brand-emerald font-semibold"><FileText className="h-4 w-4" /> Business Activities</div>
                    <span data-testid="activity-counter" className={`text-xs font-bold px-2.5 py-1 rounded-full ${selectedActivities.length >= activityLimit ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 brand-emerald'}`}>
                      {selectedActivities.length} / {activityLimit} Activities Used
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Search & add activities (DED list)</label>
                      <Input
                        data-testid="business-activity"
                        value={activityQuery}
                        onChange={(e) => setActivityQuery(e.target.value)}
                        disabled={selectedActivities.length >= activityLimit}
                        className="mt-1 h-11 rounded-lg"
                        placeholder={selectedActivities.length >= activityLimit ? `Limit of ${activityLimit} reached` : 'e.g., E-Commerce, Consultancy, Trading'}
                      />
                      {activitySuggestions.length > 0 && (
                        <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                          {activitySuggestions.map((activity) => (
                            <button
                              key={activity.id}
                              type="button"
                              data-testid={`activity-suggestion-${activity.id}`}
                              onClick={() => addActivity(activity.activity_name)}
                              className="block w-full px-4 py-2 text-left text-sm hover:bg-emerald-50 border-b border-slate-100 last:border-0"
                            >
                              <span className="font-semibold text-slate-900">{activity.activity_name}</span>
                              <span className="ml-2 text-xs text-slate-500">{activity.activity_code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedActivities.length > 0 && (
                      <div className="flex flex-wrap gap-2" data-testid="selected-activities">
                        {selectedActivities.map((a) => (
                          <span key={a} className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-600 text-white pl-3 pr-2 py-1.5 rounded-full">
                            {a}
                            <button type="button" onClick={() => removeActivity(a)} data-testid={`remove-activity-${a}`} className="hover:bg-white/20 rounded-full p-0.5"><X className="h-3 w-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500">This package allows up to {activityLimit} activities. Need more? Choose a higher package or request a quote.</p>
                  </div>
                  <div className="mt-4">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Number of Shareholders</label>
                      <Select value={String(draft.business.shareholders)} onValueChange={(v) => upd('business.shareholders', Number(v))}>
                        <SelectTrigger className="mt-1 h-11 rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>{[1,2,3,4,5].map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {!user && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                    Continue as guest or <button type="button" onClick={() => navigate(`/login?redirect=${encodeURIComponent('/checkout')}`)} className="underline font-semibold">sign in</button> to track your order.
                  </div>
                )}
              </div>
            )}

            {/* Step 3 — Payment */}
            {step === 3 && order && (
              <div className="space-y-5 fade-up" data-testid="step-3">
                <div className="flex items-center gap-2 text-brand-emerald font-semibold"><CreditCard className="h-4 w-4" /> Complete your payment</div>

                {/* Payment choice: Full vs Reserve */}
                <div className="grid grid-cols-2 gap-3" data-testid="pay-choice">
                  <button
                    type="button"
                    data-testid="pay-choice-full"
                    onClick={() => setPayChoice('full')}
                    className={`text-left rounded-2xl border-2 p-4 transition ${payChoice === 'full' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300'}`}
                  >
                    <div className="text-[11px] uppercase tracking-[0.18em] font-bold brand-emerald">Pay Full Amount</div>
                    <div className="font-display text-2xl font-bold text-slate-900 mt-1">AED {breakdown.total.toLocaleString()}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Pay the complete package now</div>
                  </button>
                  <button
                    type="button"
                    data-testid="pay-choice-reserve"
                    onClick={() => setPayChoice('reserve')}
                    className={`text-left rounded-2xl border-2 p-4 transition ${payChoice === 'reserve' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white hover:border-amber-300'}`}
                  >
                    <div className="text-[11px] uppercase tracking-[0.18em] font-bold brand-bronze">Pay Deposit</div>
                    <div className="font-display text-2xl font-bold text-slate-900 mt-1">AED {getPrebookingAmount().toLocaleString()}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Refundable hold · pay balance later</div>
                  </button>
                </div>

                <div className="rounded-2xl bg-emerald-50 border border-emerald-900/10 p-4 text-sm">
                    Order reference <span className="font-mono font-bold brand-emerald">{order.reference}</span>. {payChoice === 'full' ? <>Paying the full amount of <span className="font-semibold">AED {breakdown.total.toLocaleString()}</span>.</> : <>Pay the AED {getPrebookingAmount()} deposit to lock your slot. Refundable before licence application.</>}
                </div>

                <div className="flex gap-2 p-1 bg-slate-100 rounded-full text-xs font-semibold">
                  <button data-testid="pay-tab-card" onClick={() => setPayTab('card')} className={`flex-1 py-2.5 rounded-full transition ${payTab === 'card' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}>Pay by Card (Stripe)</button>
                  <button data-testid="pay-tab-bank" onClick={() => setPayTab('bank')} className={`flex-1 py-2.5 rounded-full transition ${payTab === 'bank' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}>Bank Transfer</button>
                </div>

                {payTab === 'card' && (
                  <div className="space-y-3" data-testid="pay-card-panel">
                    <div className="text-sm text-slate-600 leading-relaxed">
                      You&apos;ll be redirected to Stripe&apos;s secure checkout. We never see your card details.
                    </div>
                    <Button data-testid="pay-card-btn" disabled={busy} onClick={payCard} className="btn-primary rounded-full w-full h-12">
                      {busy ? 'Redirecting…' : <>Pay AED {payAmount.toLocaleString()} securely <ChevronRight className="h-4 w-4 ml-1" /></>}
                    </Button>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Card payments require a Stripe Edge Function; bank transfer is active in this build.</div>
                  </div>
                )}

                {payTab === 'bank' && (
                  <div className="space-y-3" data-testid="pay-bank-panel">
                    <div className="rounded-xl bg-white border border-slate-200 p-4 text-sm space-y-1">
                      <div className="text-[10px] uppercase tracking-[0.22em] brand-bronze font-bold flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5" /> Bank Details</div>
                      <div><span className="text-slate-500">Beneficiary:</span> <span className="font-semibold">{COMPANY_INFO.bank.accountName}</span></div>
                      <div><span className="text-slate-500">Bank:</span> {COMPANY_INFO.bank.name}</div>
                      <div><span className="text-slate-500">SWIFT/BIC:</span> {COMPANY_INFO.bank.swift}</div>
                      <div><span className="text-slate-500">IBAN:</span> <span className="font-mono">{COMPANY_INFO.bank.iban}</span></div>
                      <div><span className="text-slate-500">Amount:</span> <span className="font-semibold">AED {payAmount.toLocaleString()}</span></div>
                      <div><span className="text-slate-500">Reference:</span> <span className="font-mono">{order.reference}</span></div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Payer Name</label>
                      <Input data-testid="bank-payer-input" value={bankProof.payer_name} onChange={(e) => setBankProof((p) => ({ ...p, payer_name: e.target.value }))} className="mt-1 h-11 rounded-lg" placeholder="As on bank account" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Receipt (PDF or image, max 4MB)</label>
                      <label className="mt-1 flex items-center gap-2 h-11 rounded-lg border-2 border-dashed border-slate-300 px-3 cursor-pointer hover:border-emerald-500">
                        <Upload className="h-4 w-4 brand-emerald" />
                        <span className="text-sm text-slate-700 truncate">{bankProof.file_name || 'Click to attach receipt'}</span>
                        <input data-testid="bank-file-input" type="file" accept="image/*,application/pdf" className="hidden" onChange={onProofFile} />
                      </label>
                    </div>
                    <Button data-testid="bank-submit-btn" disabled={busy} onClick={submitBankProof} className="btn-primary rounded-full w-full h-12">
                      {busy ? 'Uploading…' : <>Submit proof <ChevronRight className="h-4 w-4 ml-1" /></>}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4 — Confirmation */}
            {step === 4 && (
              <div className="space-y-5 text-center fade-up" data-testid="step-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 grid place-items-center"><CheckCircle2 className="h-8 w-8 brand-emerald" /></div>
                <h2 className="font-display text-3xl font-semibold text-slate-900">Order confirmed!</h2>
                <p className="text-slate-600">Your reference is <span className="font-mono font-bold brand-emerald">{order?.reference}</span>. Our team will WhatsApp you within minutes to begin documentation.</p>
                <div className="grid sm:grid-cols-2 gap-3 max-w-md mx-auto pt-3">
                  <Button onClick={() => navigate('/dashboard')} className="btn-primary rounded-full h-11">Go to dashboard</Button>
                  <Button onClick={() => navigate('/')} variant="outline" className="rounded-full h-11 border-slate-300">Back home</Button>
                </div>
              </div>
            )}

            {/* Nav buttons */}
            {step < 3 && (
              <div className="mt-8 flex items-center justify-between">
                <Button onClick={back} disabled={step === 1} variant="outline" className="rounded-full px-5 h-11 border-slate-300" data-testid="step-back-btn">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={next} disabled={busy || !pricingLoaded || !currentZone} className="btn-primary rounded-full px-7 h-11" data-testid="step-next-btn">
                  {busy ? 'Saving…' : <>Continue <ChevronRight className="h-4 w-4 ml-1" /></>}
                </Button>
              </div>
            )}
            {step === 3 && (
              <div className="mt-6 flex items-center justify-between">
                <Button onClick={back} variant="outline" className="rounded-full px-5 h-11 border-slate-300">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <div className="text-xs text-slate-500">Order ref: <span className="font-mono">{order?.reference}</span></div>
              </div>
            )}
            </>)}
          </div>

          {/* SUMMARY */}
          <div className="card-elevated rounded-3xl p-7 sticky top-24 h-fit" data-testid="checkout-summary">
            <div className="text-[10px] uppercase tracking-[0.22em] brand-bronze font-bold">Order Summary</div>
            <div className="mt-2 font-display text-sm">
              {breakdown.items.map((it, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => handleBreakdownClick(it)}
                  disabled={it.type === 'service'}
                  className={`w-full rounded-2xl px-3 py-2 text-left transition ${it.type !== 'service' ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'} ${it.type === 'service' ? 'opacity-80' : ''}`}
                >
                  <div className="flex justify-between text-slate-700">
                    <span className="truncate pr-2">{it.l}</span>
                    <span className="font-semibold shrink-0">
                      {it.original ? <span className="mr-2 text-slate-400 line-through">AED {it.original.toLocaleString()}</span> : null}
                      AED {it.v.toLocaleString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">Click a line to edit the package, visa count or add-ons.</div>
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-baseline">
              <span className="text-sm text-slate-500">Total (Year 1)</span>
              <span className="font-display text-2xl font-bold text-slate-900" data-testid="summary-total">AED {breakdown.total.toLocaleString()}</span>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-[10px] uppercase tracking-[0.22em] brand-bronze font-bold">Today&apos;s pre-booking</div>
              <div className="font-display text-xl font-bold text-slate-900">AED {getPrebookingAmount()} <span className="text-xs font-normal text-slate-500">refundable</span></div>
              <div className="mt-1 text-[11px] text-slate-600">Optional reserve-slot payment. Full payment can be completed after advisor confirmation.</div>
            </div>
            <div className="mt-5 text-[11px] text-slate-500 flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 brand-emerald" /> Lic {COMPANY_INFO.license} · UAE Consultancy</div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
