"use client";

import { useState } from "react";

export function ContactBroker({ address }: { address: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full px-6 py-3.5 rounded-xl bg-[color:var(--color-accent)] text-white font-medium hover:bg-[color:var(--color-accent-hover)] transition"
      >
        Contact broker
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[color:var(--color-surface)] rounded-2xl p-6 border border-[color:var(--color-line)]"
          >
            {sent ? (
              <div className="text-center py-6">
                <p className="font-display text-2xl mb-2">Thanks — we&rsquo;ll be in touch.</p>
                <p className="text-[color:var(--color-ink-soft)]">
                  A broker covering {address} will reach out within one business day.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-6 text-sm underline text-[color:var(--color-ink-soft)]"
                >
                  Close
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="space-y-3"
              >
                <p className="font-display text-2xl">Request a tour</p>
                <input required name="name" placeholder="Your name" className="w-full px-4 py-3 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-background)] outline-none focus:border-[color:var(--color-accent)]" />
                <input required name="email" type="email" placeholder="Email" className="w-full px-4 py-3 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-background)] outline-none focus:border-[color:var(--color-accent)]" />
                <textarea name="notes" placeholder="Anything we should know? (optional)" rows={3} className="w-full px-4 py-3 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-background)] outline-none focus:border-[color:var(--color-accent)] resize-none" />
                <button type="submit" className="w-full px-6 py-3 rounded-xl bg-[color:var(--color-accent)] text-white font-medium hover:bg-[color:var(--color-accent-hover)] transition">
                  Send request
                </button>
                <button type="button" onClick={() => setOpen(false)} className="w-full text-sm text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
