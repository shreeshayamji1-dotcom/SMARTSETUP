import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  { q: 'How much does it cost to set up a company in the UAE?', a: 'Free zone licences start from around AED 4,888 (ANCFZ). Final cost depends on jurisdiction, visa count, office type and add-ons. Use our Cost Calculator or request a quote for exact pricing.' },
  { q: 'What is the difference between Free Zone and Mainland?', a: 'Free zones offer 100% ownership, tax benefits and fast setup but trade mainly within the zone / internationally. Mainland allows trading anywhere in the UAE and government contracts. We help you pick based on your activity.' },
  { q: 'How many visas can I get with my licence?', a: 'It depends on the package and office type. Packages range from 0 to 10+ visas. Each free zone page shows the included and maximum visas per package.' },
  { q: 'How long does company formation take?', a: 'Most free zone licences are issued within 1–5 working days once documents are complete. Visa processing adds 5–14 working days.' },
  { q: 'Do I need a physical office?', a: 'No. Many free zones allow flexi-desk / virtual office options. A physical office may be required for higher visa counts or certain activities.' },
  { q: 'What is the Founder Club?', a: 'A one-time AED 999 membership (first 500 founders) giving 10% renewal discounts, up to 15% service discounts, dedicated advisor access, and tax/VAT/visa alerts.' },
  { q: 'Is corporate tax applicable to my business?', a: 'UAE Corporate Tax is 9% on taxable income above AED 375,000. Qualifying free-zone income may be 0%. We assess your position and handle registration & filing.' },
  { q: 'Can I pay in instalments?', a: 'Yes — many packages support instalment options, and you can reserve your slot with a refundable AED 999 at checkout before paying the full amount.' },
];

export default function FAQs() {
  const [open, setOpen] = useState(0);
  return (
    <div data-testid="faqs-page">
      <Navbar />
      <section className="hero-gradient grain">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 pt-12 pb-10">
          <span className="text-[11px] uppercase tracking-[0.22em] text-slate-600 font-semibold">Help Center</span>
          <h1 className="mt-4 font-display text-4xl lg:text-6xl font-semibold text-slate-900">Frequently asked questions</h1>
          <p className="mt-4 text-lg text-slate-600">Everything you need to know about UAE business setup, visas and pricing.</p>
        </div>
      </section>
      <section className="py-16 bg-[#FFFCF5]">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 space-y-3">
          {FAQS.map((f, i) => (
            <div key={f.q} className="card-elevated rounded-2xl overflow-hidden" data-testid={`faq-${i}`}>
              <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center justify-between gap-4 p-5 text-left">
                <span className="font-semibold text-slate-900">{f.q}</span>
                <ChevronDown className={`h-5 w-5 brand-emerald shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && <div className="px-5 pb-5 text-slate-600 text-sm leading-relaxed -mt-1">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
