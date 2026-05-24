import { jsonSchema, tool } from "ai";
import { fetchPublicUrlText } from "@/lib/server/ai-web-fetch-core";

export { fetchPublicUrlText } from "@/lib/server/ai-web-fetch-core";

export const aiWebFetchTools = {
  fetch_url: tool({
    description:
      "Fetch a public HTTP(S) URL and return readable text. Use start offsets to continue long pages yourself without asking the user for permission.",
    inputSchema: jsonSchema<{ start?: number; url: string }>({
      type: "object",
      additionalProperties: false,
      properties: {
        start: {
          description: "Optional character offset for reading the next chunk of a long page.",
          minimum: 0,
          type: "number",
        },
        url: {
          description: "The public http or https URL to fetch.",
          type: "string",
        },
      },
      required: ["url"],
    }),
    execute: async ({ start, url }) => fetchPublicUrlText(url, { start }),
  }),
};
