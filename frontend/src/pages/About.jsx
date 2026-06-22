import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Sparkles, ShieldCheck, HandCoins, Eye, Rocket } from 'lucide-react';

export default function About() {
  const values = [
    { i: ShieldCheck, t: 'Pure neutrality', d: 'No commissions from free zones. Our algorithm ranks zones on your needs alone.' },
    { i: Eye, t: 'Full transparency', d: 'We reveal every renewal, e-channel and office cost upfront — no surprises.' },
    { i: HandCoins, t: 'Founder-friendly', d: 'Honest pricing, no oversell, no high-pressure follow-ups. Just useful advice.' },
    { i: Rocket, t: 'Modern + fast', d: 'A digital-first workflow that gets your trade licence faster than legacy firms.' },
  ];
  return (
    <div>
      <Navbar />
      <section className="hero-gradient grain">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 lg:pt-24 pb-16">
          <div className="flex items-center gap-2 fade-up"><Sparkles className="h-4 w-4 brand-bronze" /><span className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Our Story</span></div>
          <h1 className="mt-4 font-display text-5xl lg:text-7xl font-semibold leading-[1.02] text-slate-900 fade-up delay-100">UAE business setup—<br /><span className="shine-text">made honest again.</span></h1>
          <p className="mt-5 text-lg text-slate-600 max-w-3xl fade-up delay-200">SmartSetupUAE was built by entrepreneurs frustrated with sales-driven consultancies. We rebuilt the process around data, transparency and a single goal: the right fit for your specific business — not the highest commission for us.</p>
        </div>
      </section>
      <section className="py-20 bg-[#FFFCF5]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((v, i) => (
            <div key={i} className="card-elevated rounded-2xl p-6 reveal" style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="h-11 w-11 rounded-xl bg-emerald-50 grid place-items-center"><v.i className="h-5 w-5 brand-emerald" /></div>
              <div className="font-display text-lg font-semibold text-slate-900 mt-4">{v.t}</div>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{v.d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="py-20 bg-[#F8F3E8]">
        <div className="max-w-5xl mx-auto px-5 lg:px-8 grid lg:grid-cols-3 gap-8 items-start">
          {[
            { n: '40+', l: 'UAE jurisdictions compared' },
            { n: 'AED 4,888', l: 'Lowest legitimate free zone' },
            { n: '500', l: 'Free-advisory founders served' },
          ].map((s) => (
            <div key={s.l}>
              <div className="font-display text-5xl font-bold brand-emerald">{s.n}</div>
              <div className="mt-2 text-slate-600 max-w-xs">{s.l}</div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
