import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Crown, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GoldenVisa() {
  const navigate = useNavigate();
  const tracks = [
    { t: 'Investors', d: 'Real estate AED 2M+, public investment AED 2M+, or business shareholder.', who: 'High-net-worth & business owners' },
    { t: 'Entrepreneurs', d: 'Approved by an accredited UAE business incubator, or successful start-up valued AED 500K+.', who: 'Founders' },
    { t: 'Specialised Talent', d: 'Doctors, scientists, engineers, executives with salary AED 30K+, PhDs, and creatives endorsed by UAE authority.', who: 'Skilled professionals' },
    { t: 'Outstanding Students', d: 'Top UAE high school graduates or first-class degree holders from top global universities.', who: 'Students' },
  ];
  return (
    <div>
      <Navbar />
      <section className="hero-gradient grain">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 lg:pt-16 pb-14">
          <div className="flex items-center gap-2 fade-up"><Crown className="h-4 w-4 brand-bronze" /><span className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">UAE Golden Visa</span></div>
          <h1 className="mt-4 font-display text-5xl lg:text-7xl font-semibold leading-[1.02] text-slate-900 fade-up delay-100">10-year residency,<br /><span className="shine-text">for the worlds best.</span></h1>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl fade-up delay-200">A long-term UAE residency for investors, entrepreneurs, talent and students. Renewable. No employer sponsor required.</p>
          <div className="mt-7 flex gap-3 fade-up delay-300">
            <Button onClick={() => navigate('/consultation?service=Golden%20Visa&source=golden-visa', { state: { service: 'Golden Visa', message: 'I want to check Golden Visa eligibility for free.' } })} className="btn-primary rounded-full px-7 h-12">Check Eligibility — Free <ArrowRight className="h-4 w-4 ml-2" /></Button>
          </div>
        </div>
      </section>
      <section className="py-20 bg-[#FFFCF5]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tracks.map((t, i) => (
            <div key={i} className="card-elevated rounded-2xl p-6 reveal" style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="h-11 w-11 rounded-xl bg-amber-50 grid place-items-center"><Crown className="h-5 w-5 brand-bronze" /></div>
              <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-slate-500 mt-4">{t.who}</div>
              <div className="font-display text-xl font-semibold text-slate-900 mt-1">{t.t}</div>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{t.d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="py-20 bg-[#F8F3E8]">
        <div className="max-w-5xl mx-auto px-5 lg:px-8">
          <div className="card-elevated rounded-3xl p-9">
            <div className="text-[11px] uppercase tracking-[0.22em] font-semibold brand-bronze">Our Service</div>
            <h2 className="mt-2 font-display text-3xl lg:text-4xl font-semibold text-slate-900">Golden Visa Consulting — AED 4,500</h2>
            <ul className="mt-5 space-y-2">
              {['Free eligibility assessment', 'Document checklist & preparation', 'ICA submission and follow-up', 'Medical, biometrics, EID scheduling', 'Family visa add-on (spouse + children)', 'Renewal reminders & lifelong support'].map((p) => (
                <li key={p} className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 brand-emerald shrink-0 mt-0.5" /><span className="text-slate-700">{p}</span></li>
              ))}
            </ul>
            <Button onClick={() => navigate('/consultation?service=Golden%20Visa&source=golden-visa', { state: { service: 'Golden Visa', message: 'I want to apply for Golden Visa support.' } })} className="btn-primary rounded-full mt-6 px-6 h-11">Apply Now</Button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
