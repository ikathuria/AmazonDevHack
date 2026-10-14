// Tool registry. Every Homebase capability is defined once here and exposed three ways:
// MCP (Alexa+), REST (TV D-pad / web buttons) and the simulated-Alexa agent (Bedrock tool use).
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Store } from "./store.js";
import type { Queue } from "./queue.js";

export type ToolContext = {
  store: Store;
  queue: Queue;
  householdId: string;
  now: () => Date;
};

export type ToolResult = { text: string; data?: Record<string, unknown>; isError?: boolean };

export type ToolDef<S extends z.ZodRawShape = z.ZodRawShape> = {
  name: string;
  title: string;
  description: string;
  input: S;
  readOnly?: boolean;
  handler: (ctx: ToolContext, args: z.infer<z.ZodObject<S>>) => Promise<ToolResult>;
};

export const defineTool = <S extends z.ZodRawShape>(def: ToolDef<S>) => def as unknown as ToolDef;

export async function runTool(tool: ToolDef, ctx: ToolContext, rawArgs: unknown): Promise<ToolResult> {
  const parsed = z.object(tool.input).safeParse(rawArgs ?? {});
  if (!parsed.success) return { text: `I couldn't understand that request: ${parsed.error.issues[0]?.message ?? "invalid input"}.`, isError: true };
  try {
    return await tool.handler(ctx, parsed.data);
  } catch (err) {
    console.error(`[tool:${tool.name}]`, err);
    return { text: "I couldn't reach your household's records just now, so nothing changed. Try again in a moment.", isError: true };
  }
}

export function registerMcpTools(server: McpServer, tools: ToolDef[], ctx: ToolContext) {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { title: tool.title, description: tool.description, inputSchema: tool.input, annotations: { readOnlyHint: !!tool.readOnly } },
      async (args: unknown) => {
        const r = await runTool(tool, ctx, args);
        return {
          content: [{ type: "text" as const, text: r.text }],
          ...(r.data ? { structuredContent: r.data } : {}),
          ...(r.isError ? { isError: true } : {}),
        };
      },
    );
  }
}

// JSON Schema for each tool, used by the simulated-Alexa agent's Bedrock tool config.
export function toolJsonSchema(tool: ToolDef) {
  const schema = z.toJSONSchema(z.object(tool.input)) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}
