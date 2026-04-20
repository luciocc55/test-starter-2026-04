import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[color:var(--color-background)]">
      <Suspense fallback={<div className="text-sm text-[color:var(--color-ink-soft)]">Loading…</div>}>
        <SignUp />
      </Suspense>
    </main>
  );
}
