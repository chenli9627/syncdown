import { jsonSchema, tool } from "ai";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_RESPONSE_BYTES = 256 * 1024;
const MAX_TEXT_LENGTH = 12_000;
const REQUEST_TIMEOUT_MS = 8_000;
const USER_AGENT = "Syncdown-AI-Web-Fetch/1.0";

type FetchUrlResult =
  | {
      error?: undefined;
      finalUrl: string;
      text: string;
      title: string | null;
      truncated: boolean;
    }
  | {
      error: string;
      finalUrl?: string;
      text?: undefined;
      title?: undefined;
      truncated?: undefined;
    };

export const aiWebFetchTools = {
  fetch_url: tool({
    description:
      "Fetch a public HTTP(S) URL and return readable text. Use this only when the user asks for current web information, asks to open a link, or explicitly asks you to access the internet.",
    inputSchema: jsonSchema<{ url: string }>({
      type: "object",
      additionalProperties: false,
      properties: {
        url: {
          type: "string",
          description: "The public http or https URL to fetch.",
        },
      },
      required: ["url"],
    }),
    execute: async ({ url }) => fetchPublicUrlText(url),
  }),
};

export async function fetchPublicUrlText(
  rawUrl: string,
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
      const location = response.headers.get("location");
      return {
        error: location
          ? `The URL redirects to ${location}. Ask the user before fetching the redirected URL.`
          : "The URL redirects but did not provide a Location header.",
        finalUrl: response.url || parsedUrl.url,
      };
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
    const readableText = html ? htmlToReadableText(text) : text;
    const trimmedText = normalizeWhitespace(readableText).slice(0, MAX_TEXT_LENGTH);

    return {
      finalUrl: response.url || parsedUrl.url,
      text: trimmedText || "(no readable text)",
      title,
      truncated: truncated || normalizeWhitespace(readableText).length > MAX_TEXT_LENGTH,
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

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "0.0.0.0"
  ) {
    return true;
  }

  const ipVersion = isIP(normalized);

  if (ipVersion === 4) {
    const parts = normalized.split(".").map((part) => Number.parseInt(part, 10));
    const [first = 0, second = 0] = parts;

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
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
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

  const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    text: new TextDecoder().decode(bytes),
    truncated,
  };
}

function extractHtmlTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeHtml(stripTags(match[1])).trim() || null : null;
}

function htmlToReadableText(html: string) {
  return decodeHtml(
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

function decodeHtml(input: string) {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function normalizeWhitespace(input: string) {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
