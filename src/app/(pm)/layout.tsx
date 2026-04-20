import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "PM Platform", template: "%s · PM" },
  description: "Property management platform",
};

export default function PmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[color:var(--color-background)]">
      <header className="flex items-center justify-between px-8 py-4 border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        <nav className="flex items-center gap-6">
          <Link href="/import" className="font-display text-lg text-[color:var(--color-ink)]">
            PM Platform
          </Link>
          <Link href="/import" className="text-sm text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">
            Import
          </Link>
          <Link href="/tenants" className="text-sm text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">
            Tenants
          </Link>
          <Link href="/leases" className="text-sm text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">
            Leases
          </Link>
          <Link href="/flagged" className="text-sm text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">
            Flagged
          </Link>
        </nav>
        <UserButton />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
