import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sha256 } from "@/lib/import/hash";
import { parseImport } from "@/lib/import/parse";
import { loadSampleZip } from "@/lib/import/sample";

export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const url = new URL(req.url);
  const useSample = url.searchParams.get("sample") === "1";
  const force = url.searchParams.get("force") === "1";

  let bytes: Buffer;
  let fileName: string;

  if (useSample) {
    const sample = await loadSampleZip();
    bytes = sample.bytes;
    fileName = sample.fileName;
  } else {
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength > MAX_BYTES) {
      return Response.json(
        { error: "file_too_large", limitBytes: MAX_BYTES },
        { status: 413 },
      );
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "no_file" }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: "file_too_large", limitBytes: MAX_BYTES },
        { status: 413 },
      );
    }
    bytes = Buffer.from(await file.arrayBuffer());
    fileName = file.name;
  }

  const hash = sha256(bytes);

  const existing = await db.importBatch.findUnique({
    where: { userId_fileHash: { userId: user.id, fileHash: hash } },
  });
  if (existing && !force) {
    return Response.json(
      {
        error: "duplicate_file",
        existingBatchId: existing.id,
        uploadedAt: existing.uploadedAt,
        status: existing.status,
      },
      { status: 409 },
    );
  }

  const finalHash = force ? `${hash}#force-${Date.now()}` : hash;

  const batch = await db.importBatch.create({
    data: {
      userId: user.id,
      sourceSystem: "buildium",
      fileName,
      fileHash: finalHash,
      fileBytes: bytes as unknown as Uint8Array<ArrayBuffer>,
      status: "parsing",
      uploadedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  });

  try {
    await parseImport(batch.id, bytes);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.importBatch.update({
      where: { id: batch.id },
      data: { status: "failed", errorMessage: msg },
    });
    return Response.json({ error: "parse_failed", detail: msg }, { status: 500 });
  }

  return Response.json({ batchId: batch.id }, { status: 201 });
}
