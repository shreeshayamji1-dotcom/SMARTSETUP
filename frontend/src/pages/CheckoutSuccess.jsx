import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { CheckCircle2, Sparkles } from 'lucide-react';

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reference = params.get('reference') || params.get('order') || 'your order';

  const message = useMemo(() => {
    if (params.get('bank') === 'true') return 'Your bank-transfer order was saved in Supabase and is pending verification.';
    return 'Your order was saved in Supabase. Our advisor will contact you shortly.';
  }, [params]);

  return (
    <div>
      <Navbar />
      <section className="hero-gradient grain min-h-[70vh]">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-16 pb-24" data-testid="checkout-success-page">
          <div className="card-elevated rounded-3xl p-9 text-center">
            <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 grid place-items-center"><CheckCircle2 className="h-10 w-10 brand-emerald" /></div>
            <div className="mt-4 flex items-center justify-center gap-2"><Sparkles className="h-4 w-4 brand-bronze" /><span className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Order Confirmed</span></div>
            <h1 className="mt-3 font-display text-4xl font-semibold text-slate-900">Slot reserved!</h1>
            <p className="mt-3 text-slate-600">Reference: <span className="font-mono font-bold brand-emerald">{reference}</span></p>
            <p className="mt-2 text-slate-600">{message}</p>

            <div className="mt-8 grid sm:grid-cols-2 gap-3 max-w-md mx-auto">
              <Button onClick={() => navigate('/dashboard')} className="btn-primary rounded-full h-11">Go to dashboard</Button>
              <Button onClick={() => navigate('/')} variant="outline" className="rounded-full h-11 border-slate-300">Back home</Button>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
