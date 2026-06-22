import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Hero from '../components/Hero';
import AISearch from '../components/AISearch';
import ActivitySearch from '../components/ActivitySearch';
import FreeZonesShowcase from '../components/FreeZonesShowcase';
import { ArchitecturalAdvantage, PlatformStrengthsSection } from '../components/FeaturesSection';
import { IndustryRecommendations, ProcessSteps, Testimonials } from '../components/StoriesSections';
import CTASection from '../components/CTASection';
import { Sparkles } from 'lucide-react';

function TrustMarquee() {
  const items = ['IFZA', 'Meydan', 'SHAMS', 'SPC', 'RAKEZ', 'ANCFZ', 'JAFZA', 'DMCC', 'KIZAD', 'TECOM'];
  return (
    <div className="py-10 bg-[#F8F3E8] overflow-hidden border-y border-emerald-900/5">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-semibold text-slate-600 shrink-0">
          <Sparkles className="h-3.5 w-3.5 brand-bronze" />
          Working alongside 40+ jurisdictions
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="marquee gap-12">
            {[...items, ...items].map((it, i) => (
              <span key={i} className="font-display text-2xl font-semibold text-slate-400 hover:text-slate-700 transition-colors shrink-0">{it}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div>
      <Navbar />
      <Hero />
      <TrustMarquee />
      <AISearch />
      <ActivitySearch compact />
      <ArchitecturalAdvantage />
      <FreeZonesShowcase />
      <IndustryRecommendations />
      <ProcessSteps />
      <Testimonials />
      <PlatformStrengthsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
