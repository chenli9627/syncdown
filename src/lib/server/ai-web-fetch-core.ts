import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { decodeHtmlEntities } from "@/lib/html-entities";

const READ_LENGTH = 200_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;
const USER_AGENT = "Syncdown-AI-Web-Fetch/1.0";

type FetchUrlOptions = {
  start?: number;
};

type FetchUrlResult =
  | {
      contentLimitReached: boolean;
      end: number;
      error?: undefined;
      finalUrl: string;
      hasMore: boolean;
      nextStart: number | null;
      start: number;
      text: string;
      title: string | null;
      totalTextLength: number;
    }
  | {
      error: string;
      finalUrl?: string;
    };

export async function fetchPublicUrlText(
  rawUrl: string,
  options: FetchUrlOptions = {},
  fetchImpl: typeof fetch = fetch,
  lookupImpl: typeof lookup = lookup,
): Promise<FetchUrlResult> {
  const parsedUrl = parseAllowedPublicUrl(rawUrl);

  if (!parsedUrl.ok) {
    return { error: parsedUrl.error };
  }
  const resolvedHost = await resolveAllowedPublicHost(parsedUrl.hostname, lookupImpl);

  if (!resolvedHost.ok) {
    return { error: resolvedHost.error, finalUrl: parsedUrl.url };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(parsedUrl.url, {
      headers: {
        accept: "text/html,text/plain,application/json,application/xml,text/xml;q=0.9,*/*;q=0.5",
        "user-agent": USER_AGENT,
      },
      redirect: "manual",
      signal: controller.signal,
    });
    if (response.status >= 300 && response.status < 400) {
      return getRedirectError(response, parsedUrl.url);
    }

    if (!response.ok) {
      return {
        error: `Fetch failed with HTTP ${response.status}.`,
        finalUrl: response.url || parsedUrl.url,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!isTextContentType(contentType)) {
      return {
        error: `Unsupported content type: ${contentType || "unknown"}. Only text-like pages are supported.`,
        finalUrl: response.url || parsedUrl.url,
      };
    }

    const { text, truncated } = await readResponseText(response);
    const html = contentType.toLowerCase().includes("html");
    const title = html ? extractHtmlTitle(text) : null;
    const readableText = normalizeWhitespace(html ? htmlToReadableText(text) : text);
    const start = clampStart(options.start, readableText.length);
    const end = Math.min(start + READ_LENGTH, readableText.length);

    return {
      contentLimitReached: truncated,
      end,
      finalUrl: response.url || parsedUrl.url,
      hasMore: end < readableText.length,
      nextStart: end < readableText.length ? end : null,
      start,
      text: readableText.slice(start, end) || "(no readable text)",
      title,
      totalTextLength: readableText.length,
    };
  } catch (error) {
    return {
      error: error instanceof Error && error.name === "AbortError"
        ? "Fetch timed out."
        : "Fetch failed.",
      finalUrl: parsedUrl.url,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function getRedirectError(response: Response, fallbackUrl: string) {
  const location = response.headers.get("location");
  return {
    error: location
      ? `The URL redirects to ${location}. Ask the user before fetching the redirected URL.`
      : "The URL redirects but did not provide a Location header.",
    finalUrl: response.url || fallbackUrl,
  };
}

function clampStart(start: number | undefined, textLength: number) {
  if (!Number.isFinite(start) || !start || start < 0) {
    return 0;
  }
  return Math.min(Math.floor(start), textLength);
}

function parseAllowedPublicUrl(rawUrl: string) {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return { error: "Invalid URL.", ok: false as const };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "Only http and https URLs are allowed.", ok: false as const };
  }
  if (isBlockedHostname(url.hostname)) {
    return { error: "This host is not allowed.", ok: false as const };
  }

  url.hash = "";
  return { hostname: url.hostname, ok: true as const, url: url.toString() };
}

async function resolveAllowedPublicHost(hostname: string, lookupImpl: typeof lookup) {
  if (isIP(hostname.replace(/^\[|\]$/g, ""))) {
    return { ok: true as const };
  }

  try {
    const addresses = await lookupImpl(hostname, { all: true });

    if (addresses.some((address) => isBlockedHostname(address.address))) {
      return { error: "This host resolves to a private or local address.", ok: false as const };
    }

    return { ok: true as const };
  } catch {
    return { error: "Could not resolve host.", ok: false as const };
  }
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    return true;
  }
  return isBlockedIp(normalized);
}

function isBlockedIp(value: string) {
  const ipVersion = isIP(value);

  if (ipVersion === 4) {
    const [first = 0, second = 0] = value.split(".").map((part) => Number.parseInt(part, 10));

    return (
      first === 10 ||
      first === 127 ||
      first === 0 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 169 && second === 254)
    );
  }

  if (ipVersion === 6) {
    return value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:");
  }

  return false;
}

function isTextContentType(contentType: string) {
  const lower = contentType.toLowerCase();
  return (
    lower.startsWith("text/") ||
    lower.includes("application/json") ||
    lower.includes("application/xml") ||
    lower.includes("+json") ||
    lower.includes("+xml")
  );
}

async function readResponseText(response: Response) {
  const reader = response.body?.getReader();

  if (!reader) {
    return {
      text: await response.text(),
      truncated: false,
    };
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();

    if (done || !value) {
      break;
    }

    total += value.byteLength;

    if (total > MAX_RESPONSE_BYTES) {
      truncated = true;
      chunks.push(value.slice(0, Math.max(0, value.byteLength - (total - MAX_RESPONSE_BYTES))));
      await reader.cancel();
      break;
    }

    chunks.push(value);
  }

  return {
    text: new TextDecoder().decode(joinChunks(chunks)),
    truncated,
  };
}

function joinChunks(chunks: Uint8Array[]) {
  const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
}

function extractHtmlTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(stripTags(match[1])).trim() || null : null;
}

function htmlToReadableText(html: string) {
  return decodeHtmlEntities(
    stripTags(
      html
        .replace(/<head[\s\S]*?<\/head>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<\/(?:h[1-6]|p|div|li|tr|blockquote|pre)>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n"),
    ),
  );
}

function stripTags(input: string) {
  return input.replace(/<[^>]*>/g, " ");
}

function normalizeWhitespace(input: string) {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
