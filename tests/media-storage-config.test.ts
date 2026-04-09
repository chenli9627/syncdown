import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMediaSourceUrl,
  getMediaStorageConfig,
  getS3MediaStorageConfig,
} from "../src/lib/server/media-storage/config";

const ORIGINAL_ENV = { ...process.env };

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test("defaults media storage to local backend", () => {
  delete process.env.STORAGE_BACKEND;
  delete process.env.STORAGE_PUBLIC_BASE_URL;

  assert.deepEqual(getMediaStorageConfig(), {
    backend: "local",
    publicBaseUrl: null,
  });
});

test("builds api media URL when no public media origin is configured", () => {
  delete process.env.STORAGE_PUBLIC_BASE_URL;

  assert.equal(buildMediaSourceUrl("image 1.png"), "/api/media/image%201.png");
});

test("keeps api media URL even when a public media origin is configured", () => {
  process.env.STORAGE_PUBLIC_BASE_URL = "https://cdn.example.com/media/";

  assert.equal(
    buildMediaSourceUrl("asset.png"),
    "/api/media/asset.png",
  );
});

test("reads full s3-compatible config", () => {
  process.env.STORAGE_BUCKET = "syncdown";
  process.env.STORAGE_REGION = "auto";
  process.env.STORAGE_ACCESS_KEY_ID = "key";
  process.env.STORAGE_SECRET_ACCESS_KEY = "secret";
  process.env.STORAGE_ENDPOINT = "https://s3.example.com";
  process.env.STORAGE_FORCE_PATH_STYLE = "false";

  assert.deepEqual(getS3MediaStorageConfig(), {
    accessKeyId: "key",
    bucket: "syncdown",
    endpoint: "https://s3.example.com",
    forcePathStyle: false,
    region: "auto",
    secretAccessKey: "secret",
  });
});
