import Link from "next/link";

const CHIPS = [
  "Tech startup in Hudson Yards",
  "25 people in Midtown East",
  "10,000 SF in FiDi",
  "Sublease near Penn Station",
  "Creative loft in SoHo",
  "Grand Central with outdoor space",
];

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "BTS — NYC Office Search",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="px-8 py-6 flex items-center justify-between border-b border-[color:var(--color-line)]">
        <Link
          href="/"
          className="font-display text-2xl tracking-tight text-[color:var(--color-ink)]"
        >
          BTS
        </Link>
        <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-soft)]">
          Beyond the Space · NYC Office Search
        </span>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-accent)] mb-6">
          Chat-first NYC office search
        </p>
        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl leading-[0.95] max-w-3xl text-balance">
          Describe your space.
          <br />
          <span className="italic text-[color:var(--color-accent)]">
            We&rsquo;ll find it.
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-[color:var(--color-ink-soft)] text-lg">
          AI-powered search across every NYC office submarket.
        </p>

        <form action="/search" method="GET" className="mt-10 w-full max-w-2xl">
          <label htmlFor="q" className="sr-only">
            Describe your space
          </label>
          <div className="group flex items-center bg-[color:var(--color-surface)] border border-[color:var(--color-line)] rounded-2xl shadow-[0_1px_0_rgba(0,0,0,0.02),0_12px_32px_-12px_rgba(26,24,21,0.12)] focus-within:border-[color:var(--color-accent)] transition">
            <input
              id="q"
              name="q"
              type="text"
              autoFocus
              placeholder="e.g. 10,000 SF creative loft in SoHo with phone booths"
              className="flex-1 bg-transparent px-5 py-4 text-base outline-none placeholder:text-[color:var(--color-ink-soft)]"
            />
            <button
              type="submit"
              className="m-1.5 px-5 py-2.5 rounded-xl bg-[color:var(--color-accent)] text-white text-sm font-medium hover:bg-[color:var(--color-accent-hover)] transition"
            >
              Search
            </button>
          </div>
        </form>

        <ul className="mt-8 flex flex-wrap gap-2 justify-center max-w-3xl">
          {CHIPS.map((chip) => (
            <li key={chip}>
              <Link
                href={`/search?q=${encodeURIComponent(chip)}`}
                className="inline-block px-4 py-2 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-ink)] transition"
              >
                {chip}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="px-8 py-6 border-t border-[color:var(--color-line)] text-xs text-[color:var(--color-ink-soft)] flex justify-between">
        <span>BTS Office listings</span>
        <span>
          Hudson Yards · Flatiron · FiDi · Midtown · SoHo · Tribeca · Penn ·
          Grand Central · Chelsea
        </span>
      </footer>
    </main>
  );
}
