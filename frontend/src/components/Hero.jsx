import React, { useEffect, useState } from 'react';
import { ShieldCheck, Sparkles, TrendingUp, MousePointerClick } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import SmartFinder from './SmartFinder';

const ROTATING = [
  'Business Setup UAE',
  'Company Formation Dubai',
  'Cheapest Free Zone License',
  'Mainland Trade License',
  'Activity Match Score',
  'Visa & Banking Fit',
];

export default function Hero() {
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % ROTATING.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="hero-gradient grain relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 lg:pt-20 pb-20 lg:pb-28 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7">
          <div className="flex items-center gap-2 fade-up">
            <span className="pulse-dot" />
            <span className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">UAE Licensed Consultancy</span>
          </div>
          <h1 className="mt-5 font-display text-[44px] leading-[1.05] lg:text-[68px] lg:leading-[1.02] font-semibold text-slate-900 fade-up delay-100">
            We don’t push one free zone—
            <span className="block shine-text">we help you choose the right one.</span>
          </h1>
          <p className="mt-6 text-lg lg:text-xl text-slate-600 max-w-2xl fade-up delay-200">
            Unbiased, data-driven UAE business setup help. Compare 40+ jurisdictions and receive support choosing the best free zone, mainland licence or visa solution. Starting from <span className="font-semibold text-slate-900">AED 4,888</span>.
          </p>

          <div className="mt-8 h-9 overflow-hidden fade-up delay-300">
            <div className="transition-transform duration-700" style={{ transform: `translateY(-${idx * 36}px)` }}>
              {ROTATING.map((w) => (
                <div key={w} className="h-9 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 brand-bronze" />
                  <span className="font-display font-semibold text-slate-800 text-lg">{w}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 fade-up delay-400">
            <Button onClick={() => navigate('/consultation')} className="btn-primary rounded-full px-7 h-12 text-[15px]">
              <MousePointerClick className="h-4 w-4 mr-2" /> Book Free Consultation
            </Button>
            <Button onClick={() => navigate('/free-zones')} variant="outline" className="rounded-full px-7 h-12 text-[15px] border-slate-300">
              Compare Free Zones
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-4 max-w-xl fade-up delay-500">
            {[
              { k: 'Live Pricing Data', icon: TrendingUp },
              { k: 'Zero Sales Pressure', icon: ShieldCheck },
              { k: 'No Hidden Fees', icon: Sparkles },
            ].map(({ k, icon: Icon }) => (
              <div key={k} className="flex items-start gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-900/5 grid place-items-center">
                  <Icon className="h-4 w-4 brand-emerald" />
                </div>
                <div className="text-xs font-medium text-slate-700 leading-tight pt-1">{k}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="floaty">
            <SmartFinder />
          </div>
        </div>
      </div>

      {/* Decorative blobs */}
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[#B45309]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[#0F766E]/12 blur-3xl pointer-events-none" />
    </section>
  );
}
