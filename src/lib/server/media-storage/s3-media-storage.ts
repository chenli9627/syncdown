import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type {
  MediaStorageAdapter,
  ReadableMediaFile,
  StoredMediaFile,
  WriteMediaFileInput,
} from "@/lib/server/media-storage/types";

type S3MediaStorageAdapterOptions = {
  accessKeyId: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle: boolean;
  region: string;
  secretAccessKey: string;
};

export class S3MediaStorageAdapter implements MediaStorageAdapter {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor(options: S3MediaStorageAdapterOptions) {
    this.bucket = options.bucket;
    this.client = new S3Client({
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle,
      region: options.region,
    });
  }

  async writeFile(input: WriteMediaFileInput): Promise<StoredMediaFile> {
    const id = input.id ?? crypto.randomUUID();
    const fileName = `${id}.${input.extension}`;

    await this.client.send(
      new PutObjectCommand({
        Body: input.bytes,
        Bucket: this.bucket,
        CacheControl: "public, max-age=31536000, immutable",
        ContentType: input.mimeType,
        Key: fileName,
      }),
    );

    return {
      fileName,
      id,
    };
  }

  async readFile(fileName: string): Promise<ReadableMediaFile> {
    const safeFileName = fileName.split("/").pop() ?? fileName;
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: safeFileName,
      }),
    );
    const bytes = await bodyToUint8Array(response.Body);

    return {
      bytes,
      fileName: safeFileName,
    };
  }
}

async function bodyToUint8Array(body: unknown) {
  if (!body) {
    throw new Error("Media object has no body");
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "transformToByteArray" in body &&
    typeof body.transformToByteArray === "function"
  ) {
    return new Uint8Array(await body.transformToByteArray());
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "transformToWebStream" in body &&
    typeof body.transformToWebStream === "function"
  ) {
    const stream = body.transformToWebStream() as ReadableStream<Uint8Array>;
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      chunks.push(value);
      totalLength += value.length;
    }

    const bytes = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }

    return bytes;
  }

  throw new Error("Unsupported media response body");
}
