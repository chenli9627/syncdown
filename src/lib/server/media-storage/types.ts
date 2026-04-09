export type MediaStorageBackend = "local" | "s3";

export type StoredMediaFile = {
  fileName: string;
  filePath?: string;
  id: string;
};

export type ReadableMediaFile = {
  bytes: Uint8Array;
  fileName: string;
  filePath?: string;
};

export type WriteMediaFileInput = {
  bytes: Uint8Array;
  extension: string;
  id?: string;
  mimeType?: string;
};

export interface MediaStorageAdapter {
  deleteFile(fileName: string): Promise<void>;
  writeFile(input: WriteMediaFileInput): Promise<StoredMediaFile>;
  readFile(fileName: string): Promise<ReadableMediaFile>;
}
