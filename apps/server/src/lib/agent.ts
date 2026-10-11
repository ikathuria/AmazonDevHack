// A minimal Alexa-like agent: an LLM picks Homebase tools to satisfy one spoken request.
// Used by the simulated Alexa+ experience (the rules' fallback path) and by the tool-selection eval.
// This is the *client* side; the MCP tools themselves still never call an LLM.
import { BedrockRuntimeClient, ConverseCommand, type ContentBlock, type Message, type Tool } from "@aws-sdk/client-bedrock-runtime";
import { runTool, toolJsonSchema, type ToolContext, type ToolDef } from "./tools.js";

export type ToolCall = { name: string; input: Record<string, unknown>; result: string; isError: boolean };
export type AgentTurn = { reply: string; calls: ToolCall[] };

// One model round trip: given the conversation so far, return the model's message.
export type ChatModel = (system: string, messages: Message[], tools: Tool[]) => Promise<Message>;

export function bedrockChatModel(modelId = process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-haiku-4-5-20251001-v1:0"): ChatModel {
  const client = new BedrockRuntimeClient({});
  return async (system, messages, tools) => {
    const r = await client.send(new ConverseCommand({
      modelId,
      system: [{ text: system }],
      messages,
      toolConfig: { tools },
      inferenceConfig: { maxTokens: 600, temperature: 0 },
    }));
    return r.output?.message ?? { role: "assistant", content: [{ text: "Sorry, I didn't catch that." }] };
  };
}

export const SYSTEM_PROMPT = `You are the voice of Alexa+ with the Homebase add-on installed, talking to a family in their kitchen.
Use the Homebase tools for anything about the household, meals, chores, cooking steps, timers, pantry or shopping.
Keep spoken replies to one or two short sentences, warm and plain, no markdown or lists.
When a tool's result already answers the request, say it in your own words without adding facts.
For deleting data, always ask for explicit confirmation first.`;

export function toolSpecs(tools: ToolDef[]): Tool[] {
  return tools.map((t) => ({ toolSpec: { name: t.name, description: t.description, inputSchema: { json: toolJsonSchema(t) as never } } }));
}

export async function runAgentTurn(opts: {
  utterance: string;
  history?: Message[];
  tools: ToolDef[];
  ctx: ToolContext;
  model: ChatModel;
  maxSteps?: number;
  // Eval mode: record the tool calls the model wants, without executing write tools.
  dryRun?: boolean;
}): Promise<AgentTurn & { history: Message[] }> {
  const { tools, ctx, model, maxSteps = 4, dryRun = false } = opts;
  const specs = toolSpecs(tools);
  const messages: Message[] = [...(opts.history ?? []), { role: "user", content: [{ text: opts.utterance }] }];
  const calls: ToolCall[] = [];

  for (let step = 0; step < maxSteps; step++) {
    const msg = await model(SYSTEM_PROMPT, messages, specs);
    messages.push(msg);
    const uses = (msg.content ?? []).filter((c): c is ContentBlock.ToolUseMember => "toolUse" in c && !!c.toolUse);
    if (!uses.length) {
      const reply = (msg.content ?? []).map((c) => ("text" in c ? c.text : "")).join(" ").trim();
      return { reply: reply || "Okay.", calls, history: messages };
    }
    const results: ContentBlock[] = [];
    for (const { toolUse } of uses) {
      const tool = tools.find((t) => t.name === toolUse.name);
      const input = (toolUse.input ?? {}) as Record<string, unknown>;
      const r = !tool
        ? { text: `Unknown tool ${toolUse.name}.`, isError: true }
        : dryRun && !tool.readOnly
          ? { text: "(dry run: not executed)", isError: false }
          : await runTool(tool, ctx, input);
      calls.push({ name: toolUse.name ?? "?", input, result: r.text, isError: !!r.isError });
      results.push({ toolResult: { toolUseId: toolUse.toolUseId, content: [{ text: r.text }], status: r.isError ? "error" : "success" } });
    }
    messages.push({ role: "user", content: results });
    if (dryRun) return { reply: "", calls, history: messages };
  }
  return { reply: "Sorry, that took too many steps. Could you say it another way?", calls, history: messages };
}
