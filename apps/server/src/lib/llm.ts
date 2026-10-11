// Thin LLM wrapper. Only background jobs (worker) and the simulated-Alexa agent use it; MCP tools never do.
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

export type Llm = (system: string, prompt: string, maxTokens?: number) => Promise<string>;

export function bedrockLlm(modelId = process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-haiku-4-5-20251001-v1:0"): Llm {
  const client = new BedrockRuntimeClient({});
  return async (system, prompt, maxTokens = 2000) => {
    const r = await client.send(new ConverseCommand({
      modelId,
      system: [{ text: system }],
      messages: [{ role: "user", content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens, temperature: 0.4 },
    }));
    return (r.output?.message?.content ?? []).map((c) => c.text ?? "").join("");
  };
}

// Pull the first JSON object out of a model reply (models sometimes wrap it in prose or fences).
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in model reply");
  return JSON.parse(text.slice(start, end + 1));
}
