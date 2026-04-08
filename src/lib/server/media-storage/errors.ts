export function toMediaStorageErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Media storage failed";

  if (message.includes("missing one or more required environment variables")) {
    return {
      error: "Media storage is not configured",
      status: 500,
    };
  }

  if (message.includes("NoSuchKey") || message.includes("Media not found")) {
    return {
      error: "Media not found",
      status: 404,
    };
  }

  return {
    error: "Media storage failed",
    status: 500,
  };
}
