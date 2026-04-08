import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  MediaStorageAdapter,
  ReadableMediaFile,
  StoredMediaFile,
  WriteMediaFileInput,
} from "@/lib/server/media-storage/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const MEDIA_DIR = path.join(DATA_DIR, "media");

async function ensureMediaDir() {
  await mkdir(MEDIA_DIR, { recursive: true });
}

export class LocalMediaStorageAdapter implements MediaStorageAdapter {
  async writeFile(input: WriteMediaFileInput): Promise<StoredMediaFile> {
    await ensureMediaDir();
    const id = input.id ?? crypto.randomUUID();
    const fileName = `${id}.${input.extension}`;
    const filePath = path.join(MEDIA_DIR, fileName);
    await writeFile(filePath, input.bytes);

    return {
      fileName,
      filePath,
      id,
    };
  }

  async readFile(fileName: string): Promise<ReadableMediaFile> {
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
}
