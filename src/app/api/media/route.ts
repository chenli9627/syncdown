import { NextResponse } from "next/server";
import {
  MAX_IMAGE_FILE_SIZE,
  isSupportedImageMimeType,
} from "@/features/editor/lib/image-shared";
import {
  buildMediaSourceUrl,
  getMediaStorageAdapter,
} from "@/lib/server/media-storage";
import { toMediaStorageErrorResponse } from "@/lib/server/media-storage/errors";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file uploaded", ok: false },
      { status: 400 },
    );
  }

  if (!isSupportedImageMimeType(file.type)) {
    return NextResponse.json(
      { error: "Unsupported image format", ok: false },
      { status: 400 },
    );
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return NextResponse.json(
      { error: "Image is too large", ok: false },
      { status: 400 },
    );
  }

  const extension = inferExtension(file.type);
  const bytes = new Uint8Array(await file.arrayBuffer());
  
  try {
    const written = await getMediaStorageAdapter().writeFile({
      bytes,
      extension,
      mimeType: file.type,
    });

    return NextResponse.json({
      ok: true,
      src: buildMediaSourceUrl(written.fileName),
    });
  } catch (error) {
    const failure = toMediaStorageErrorResponse(error);

    return NextResponse.json(
      { error: failure.error, ok: false },
      { status: failure.status },
    );
  }
}

function inferExtension(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "png";
  }
}
