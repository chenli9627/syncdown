import { NextResponse } from "next/server";
import { inferMimeTypeFromExtension, readMediaFile } from "@/lib/server/media-store";

type RouteContext = {
  params: Promise<{
    fileName: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { fileName } = await context.params;

  try {
    const media = await readMediaFile(fileName);
    const extension = media.fileName.split(".").pop() ?? "";

    return new NextResponse(media.bytes, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": inferMimeTypeFromExtension(extension),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Media not found", ok: false },
      { status: 404 },
    );
  }
}

