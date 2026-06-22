import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Gift, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

export default function ScratchCard() {
  const [show, setShow] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [scratchAmount, setScratchAmount] = useState(0);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const navigate = useNavigate();
  const [reward] = useState(() => {
    const existing = localStorage.getItem('ssu_scratch_coupon');
    if (existing) {
      try { return JSON.parse(existing); } catch {}
    }
    const options = [
      { discount: 5, code: 'SMARTSAVE5' },
      { discount: 8, code: 'SMARTSAVE8' },
      { discount: 10, code: 'SMARTSAVE10' },
      { discount: 12, code: 'SMARTSAVE12' },
    ];
    return options[Math.floor(Math.random() * options.length)];
  });

  useEffect(() => {
    if (localStorage.getItem('ssu_scratch_seen')) return;
    const t = setTimeout(() => setShow(true), 6000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!show) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const w = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 360;
      const h = canvas.offsetHeight || 192;
      if (!w || !h) { window.requestAnimationFrame(draw); return; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#B45309');
      grad.addColorStop(1, '#F59E0B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = 'bold 17px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scratch here to reveal your gift', canvas.width / 2, canvas.height / 2);
    };
    const t = window.setTimeout(draw, 220);
    return () => window.clearTimeout(t);
  }, [show]);

  const scratch = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();
    setScratchAmount((a) => Math.min(a + 1, 100));
    if (scratchAmount > 25 && !revealed) {
      setRevealed(true);
      localStorage.setItem('ssu_scratch_coupon', JSON.stringify(reward));
      localStorage.setItem('ssu_scratch_coupon_code', reward.code);
    }
  };

  const close = () => {
    setShow(false);
    localStorage.setItem('ssu_scratch_seen', '1');
  };

  return (
    <Dialog open={show} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-md rounded-3xl border-emerald-900/10 p-0 overflow-hidden">
        <VisuallyHidden.Root>
          <DialogTitle>Welcome scratch card discount</DialogTitle>
          <DialogDescription>Scratch the card to reveal your first-time discount.</DialogDescription>
        </VisuallyHidden.Root>
        <div className="p-7">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-semibold brand-bronze">
            <Gift className="h-4 w-4" /> Welcome Gift
          </div>
          <h3 className="mt-3 font-display text-3xl font-semibold text-slate-900">You've got a scratch card!</h3>
          <p className="mt-2 text-slate-600 text-sm">Scratch the card below to reveal your exclusive first-time discount — applies to any UAE business setup package.</p>

          <div className="mt-6 relative h-48 rounded-2xl overflow-hidden border border-amber-200 select-none">
            <div className="absolute inset-0 grid place-items-center bg-emerald-50">
              <div className="text-center">
                <Sparkles className="h-6 w-6 brand-emerald mx-auto" />
                <div className="mt-2 text-[11px] uppercase tracking-[0.22em] text-emerald-700 font-semibold">Your exclusive discount</div>
                <div className="font-display text-5xl font-bold text-slate-900 mt-1">{reward.discount}% OFF</div>
                <div className="text-xs text-slate-500">any package</div>
              </div>
            </div>
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
              onMouseDown={() => (isDrawing.current = true)}
              onMouseUp={() => (isDrawing.current = false)}
              onMouseLeave={() => (isDrawing.current = false)}
              onMouseMove={scratch}
              onTouchStart={() => (isDrawing.current = true)}
              onTouchEnd={() => (isDrawing.current = false)}
              onTouchMove={scratch}
            />
          </div>

          {revealed && (
            <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-900/10 fade-up">
              <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-700 font-semibold">Your Code</div>
              <div className="flex items-center justify-between mt-1">
                <div className="font-mono text-xl font-bold text-slate-900">{reward.code}</div>
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(reward.code)} className="rounded-full border-emerald-900/20">Copy</Button>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">Auto-applied at checkout · Valid 30 days · One-time use</div>
            </div>
          )}

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <Button onClick={() => { close(); navigate(`/checkout?coupon=${encodeURIComponent(reward.code)}`); }} className="btn-primary rounded-full flex-1">Start My Application →</Button>
            <Button onClick={close} variant="outline" className="rounded-full flex-1 border-slate-300">Browse Free Zones First</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
