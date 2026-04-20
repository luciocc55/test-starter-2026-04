export function SearchBox({
  defaultValue = "",
  placeholder = "Describe your space…",
  autoFocus = false,
  label = "Search",
}: {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  label?: string;
}) {
  return (
    <form action="/search" method="GET" className="w-full">
      <label htmlFor="q" className="sr-only">Describe your space</label>
      <div className="flex items-center bg-[color:var(--color-surface)] border border-[color:var(--color-line)] rounded-2xl shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_24px_-12px_rgba(26,24,21,0.08)] focus-within:border-[color:var(--color-accent)] transition">
        <input
          id="q"
          name="q"
          type="text"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-5 py-3.5 text-base outline-none placeholder:text-[color:var(--color-ink-soft)]"
        />
        <button
          type="submit"
          className="m-1.5 px-4 py-2 rounded-xl bg-[color:var(--color-accent)] text-white text-sm font-medium hover:bg-[color:var(--color-accent-hover)] transition"
        >
          {label}
        </button>
      </div>
    </form>
  );
}
