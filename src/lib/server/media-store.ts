import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const MEDIA_DIR = path.join(DATA_DIR, "media");

export async function ensureMediaDir() {
  await mkdir(MEDIA_DIR, { recursive: true });
}

export async function writeMediaFile(params: {
  bytes: Uint8Array;
  extension: string;
  id?: string;
}) {
  await ensureMediaDir();
  const id = params.id ?? crypto.randomUUID();
  const fileName = `${id}.${params.extension}`;
  const filePath = path.join(MEDIA_DIR, fileName);
  await writeFile(filePath, params.bytes);

  return {
    fileName,
    filePath,
    id,
  };
}

export async function readMediaFile(fileName: string) {
  await ensureMediaDir();
  const safeFileName = path.basename(fileName);
  const filePath = path.join(MEDIA_DIR, safeFileName);
  const bytes = await readFile(filePath);

  return {
    bytes,
    fileName: safeFileName,
    filePath,
  };
}

export function inferMimeTypeFromExtension(extension: string) {
  switch (extension.toLowerCase()) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

