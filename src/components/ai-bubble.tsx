export function AiBubble({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warn" }) {
  const ring = tone === "warn" ? "border-[color:var(--color-accent)]/30" : "border-[color:var(--color-line)]";
  return (
    <div className={`flex gap-3 items-start bg-[color:var(--color-surface)] border ${ring} rounded-2xl p-5`}>
      <span className="shrink-0 h-8 w-8 rounded-full bg-[color:var(--color-accent)] text-white flex items-center justify-center font-display text-sm">
        B
      </span>
      <div className="flex-1 pt-0.5 text-[color:var(--color-ink)] leading-relaxed">{children}</div>
    </div>
  );
}
