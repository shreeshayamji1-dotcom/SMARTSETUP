import React, { useState } from 'react';
import { MessageSquareText, X } from 'lucide-react';
import LeadBox from './LeadBox';

export default function UniversalLeadEnquiry() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Vertical sticky tab — visible on every page */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="universal-lead-tab"
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-[55] items-center gap-2 px-3 py-4 rounded-l-2xl bg-brand-emerald text-white shadow-2xl shadow-emerald-900/30 hover:opacity-95 transition"
          aria-label="Open lead enquiry"
          style={{ writingMode: 'vertical-rl' }}
        >
          <MessageSquareText className="h-4 w-4" style={{ writingMode: 'horizontal-tb' }} />
          <span className="text-[11px] uppercase tracking-[0.22em] font-semibold">Free Enquiry</span>
        </button>
      )}

      {/* Mobile compact button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="universal-lead-tab-mobile"
          className="md:hidden fixed bottom-24 left-5 z-[55] h-12 w-12 rounded-full bg-brand-emerald text-white grid place-items-center shadow-2xl shadow-emerald-900/30"
          aria-label="Open lead enquiry"
        >
          <MessageSquareText className="h-5 w-5" />
        </button>
      )}

      {/* Panel — centered modal so all fields are clearly visible */}
      {open && (
        <div
          data-testid="universal-lead-overlay"
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm fade-up"
          onClick={() => setOpen(false)}
        >
          <div
            data-testid="universal-lead-panel"
            className="relative w-[min(440px,calc(100vw-2rem))] max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              data-testid="universal-lead-close"
              className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white text-slate-600 hover:text-slate-900 grid place-items-center shadow-md ring-1 ring-emerald-900/10 z-10"
              aria-label="Close enquiry"
            >
              <X className="h-4 w-4" />
            </button>
            <LeadBox sourcePage="universal-sticky" />
          </div>
        </div>
      )}
    </>
  );
}
