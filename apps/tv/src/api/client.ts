// REST calls: the one-time state snapshot and the D-pad tool buttons (POST /api/tools/:name).
import {stateUrl, toolUrl} from './config';
import type {BoardState} from './types';

export class HouseholdNotFound extends Error {}

async function withTimeout<T>(ms: number, run: (signal: AbortController['signal']) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await run(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchState(): Promise<BoardState> {
  return withTimeout(8000, async (signal) => {
    const r = await fetch(stateUrl(), {signal, headers: {Accept: 'application/json'}});
    if (r.status === 404) {
      throw new HouseholdNotFound();
    }
    if (!r.ok) {
      throw new Error(`state ${r.status}`);
    }
    return (await r.json()) as BoardState;
  });
}

export type ToolReply = {text: string; isError: boolean};

// Tool replies are short spoken sentences ("Step 2 of 5: ..."); the board shows them as a toast.
export async function callTool(name: string, body: object = {}): Promise<ToolReply> {
  try {
    return await withTimeout(8000, async (signal) => {
      const r = await fetch(toolUrl(name), {
        method: 'POST',
        signal,
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as {text?: string; error?: string; isError?: boolean};
      return {text: j.text ?? j.error ?? '', isError: !!j.isError || !r.ok};
    });
  } catch {
    return {text: "Can't reach Homebase. Check the TV's connection.", isError: true};
  }
}
