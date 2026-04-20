import { readFile } from "node:fs/promises";
import path from "node:path";

export async function loadSampleZip(): Promise<{ bytes: Buffer; fileName: string }> {
  const p = path.join(process.cwd(), "data", "buildium_export.zip");
  const bytes = await readFile(p);
  return { bytes, fileName: "buildium_export_sample.zip" };
}
