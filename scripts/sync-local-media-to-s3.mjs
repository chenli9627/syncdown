import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const MEDIA_DIR = path.join(process.cwd(), ".data", "media");
const ENV_FILE = path.join(process.cwd(), ".env.local");

async function loadEnvFile(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing env files so explicit process env still works.
  }
}

function inferContentType(fileName) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function ensureBucket(client, bucket) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

async function main() {
  await loadEnvFile(ENV_FILE);
  const bucket = process.env.STORAGE_BUCKET?.trim();
  const region = process.env.STORAGE_REGION?.trim();
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY?.trim();

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("S3-compatible storage env is incomplete.");
  }

  const client = new S3Client({
    region,
    endpoint: process.env.STORAGE_ENDPOINT?.trim() || undefined,
    forcePathStyle: !["0", "false", "no"].includes(
      process.env.STORAGE_FORCE_PATH_STYLE?.trim().toLowerCase() ?? "",
    ),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  await ensureBucket(client, bucket);

  const fileNames = (await readdir(MEDIA_DIR)).sort();

  for (const fileName of fileNames) {
    const body = await readFile(path.join(MEDIA_DIR, fileName));
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: body,
        ContentType: inferContentType(fileName),
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  }

  console.log(
    `[syncdown] synced ${fileNames.length} local media file(s) from ${path.relative(process.cwd(), MEDIA_DIR)} to bucket "${bucket}"`,
  );
}

main().catch((error) => {
  console.error(
    `[syncdown] failed to sync local media: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
