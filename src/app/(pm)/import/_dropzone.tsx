"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DuplicateInfo = {
  existingBatchId: string;
  uploadedAt: string;
  forceUrl: string;
  forceBody?: FormData;
};

export function ImportDropzone() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);

  async function handleResponse(
    res: Response,
    forceUrl: string,
    forceBody?: FormData,
  ) {
    if (res.status === 409) {
      const body = await res.json();
      setDuplicate({
        existingBatchId: body.existingBatchId,
        uploadedAt: body.uploadedAt,
        forceUrl,
        forceBody,
      });
      return;
    }
    if (!res.ok) throw new Error(await res.text());
    const { batchId } = await res.json();
    router.push(`/import/${batchId}/preview`);
  }

  async function upload(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      setError("This file is larger than 20 MB. Split your export by year or property group.");
      return;
    }
    setBusy(true);
    setError(null);
    setDuplicate(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/import/upload", { method: "POST", body: form });
      await handleResponse(res, "/api/import/upload?force=1", form);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function useSample() {
    setBusy(true);
    setError(null);
    setDuplicate(null);
    try {
      const res = await fetch("/api/import/upload?sample=1", { method: "POST" });
      await handleResponse(res, "/api/import/upload?sample=1&force=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function viewExisting() {
    if (!duplicate) return;
    router.push(`/import/${duplicate.existingBatchId}/preview`);
  }

  async function forceReimport() {
    if (!duplicate) return;
    const { forceUrl, forceBody } = duplicate;
    setBusy(true);
    setDuplicate(null);
    try {
      const res = await fetch(forceUrl, { method: "POST", body: forceBody });
      if (!res.ok) throw new Error(await res.text());
      const { batchId } = await res.json();
      router.push(`/import/${batchId}/preview`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label
        className={`block border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
          busy
            ? "border-[color:var(--color-line)] opacity-60"
            : "border-[color:var(--color-line)] hover:border-[color:var(--color-accent)]"
        }`}
      >
        <input
          type="file"
          accept=".zip"
          disabled={busy}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <div className="font-display text-lg text-[color:var(--color-ink)]">
          {busy ? "Uploading & parsing…" : "Drop your Buildium ZIP here"}
        </div>
        <div className="text-sm text-[color:var(--color-ink-soft)] mt-2">
          or click to select a file
        </div>
      </label>

      <div className="text-center mt-4">
        <button
          disabled={busy}
          onClick={useSample}
          className="text-sm text-[color:var(--color-accent)] hover:underline"
        >
          Try with sample data
        </button>
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {duplicate && (
        <div
          role="alertdialog"
          aria-labelledby="dup-title"
          className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-[color:var(--color-surface)] border border-[color:var(--color-line)] rounded-xl shadow-[0_12px_32px_-12px_rgba(26,24,21,0.24)] overflow-hidden animate-in fade-in slide-in-from-bottom-4"
        >
          <div className="px-4 py-3 flex items-start justify-between gap-3 border-b border-[color:var(--color-line)]">
            <div>
              <div id="dup-title" className="text-sm font-medium text-[color:var(--color-ink)]">
                Already imported
              </div>
              <div className="text-xs text-[color:var(--color-ink-soft)] mt-0.5">
                Uploaded {new Date(duplicate.uploadedAt).toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => setDuplicate(null)}
              aria-label="Dismiss"
              className="text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)] text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="px-4 py-3 flex gap-2 justify-end bg-[color:var(--color-muted)]">
            <button
              onClick={forceReimport}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-md border border-[color:var(--color-line)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface)] disabled:opacity-50"
            >
              Re-import anyway
            </button>
            <button
              onClick={viewExisting}
              className="text-xs px-3 py-1.5 rounded-md bg-[color:var(--color-accent)] text-white hover:bg-[color:var(--color-accent-hover)]"
            >
              View existing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
