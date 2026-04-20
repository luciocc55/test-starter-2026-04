import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { submarkets } from "./listings";
import type { ParsedFilter } from "./filter";

const replySchema = z.object({
  response: z.string().max(400),
  filter: z.object({
    submarket: z.string().nullable(),
    sfMin: z.number().nullable(),
    sfMax: z.number().nullable(),
    features: z.array(z.string()).max(8),
    subleaseOrDirect: z.enum(["sublease", "direct", "any"]),
  }),
});

export type AiReply = { response: string; filter: ParsedFilter };

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

export async function parseQuery(q: string): Promise<AiReply> {
  "use cache";
  cacheLife("hours");
  cacheTag(`search:${q}`);

  const modelId = process.env.AI_MODEL ?? DEFAULT_MODEL;
  const submarketList = submarkets().join(", ");

  const prompt = `You are BTS, an AI assistant helping people find office space in NYC.
Given a natural-language query, return:
- "response": a short, warm, conversational reply (max 2 sentences, max 280 chars) that acknowledges what they asked for and sets up the results. Do not list specific addresses. No emoji.
- "filter": a structured filter extracted from the query.

Canonical submarkets: ${submarketList}. Map user phrases to this list (e.g., "near Penn Station" -> "Penn Station", "Grand Central area" -> "Grand Central", "Midtown" alone -> null because it's ambiguous between East/West). If unclear or not in the list, return null.

sfMin/sfMax: parse numeric SF hints. "~10,000 SF" -> sfMin: 7500, sfMax: 12500. "25 people" -> 3500 to 6500 (use 150 to 250 SF per person). Return null if no hint.

features: 0-5 short keywords the user mentioned or clearly implied (e.g., "tech startup" -> ["open plan", "natural light"], "creative" -> ["exposed brick", "high ceilings"]). Do NOT put "sublease" or "direct" in features.

subleaseOrDirect: "sublease" if mentioned, "direct" if mentioned, "any" otherwise.

Query: """${q}"""`;

  const { object } = await generateObject({
    model: gateway(modelId),
    schema: replySchema,
    prompt,
  });

  return {
    response: object.response,
    filter: {
      submarket: object.filter.submarket,
      sfMin: object.filter.sfMin,
      sfMax: object.filter.sfMax,
      features: object.filter.features,
      subleaseOrDirect: object.filter.subleaseOrDirect,
    },
  };
}
