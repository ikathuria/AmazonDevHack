// Server-Sent Events over XMLHttpRequest. React Native has no EventSource, but Vega's XHR delivers the response
// incrementally (readyState 3) when a progress listener is set, which was verified on the Vega Virtual Device.
// The server closes each stream after ~10 minutes (Lambda limit) and pings every 15 s; we reconnect with ?after=<seq>
// so nothing is missed, and the reducer drops any event it has already applied.
import type {StoredEvent} from './types';

export type SSEMessage = {event: string; data: string; id?: string};

// Incremental parser for the text/event-stream format. Chunks may split lines or messages anywhere.
export class SSEParser {
  private buffer = '';

  push(chunk: string): SSEMessage[] {
    this.buffer += chunk;
    const out: SSEMessage[] = [];
    const blocks = this.buffer.split(/\r?\n\r?\n/);
    this.buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      let event = 'message';
      let id: string | undefined;
      const data: string[] = [];
      for (const line of block.split(/\r?\n/)) {
        if (!line || line.startsWith(':')) {
          continue;
        }
        const i = line.indexOf(':');
        const field = i === -1 ? line : line.slice(0, i);
        const value = i === -1 ? '' : line.slice(i + 1).replace(/^ /, '');
        if (field === 'event') {
          event = value;
        } else if (field === 'data') {
          data.push(value);
        } else if (field === 'id') {
          id = value;
        }
      }
      if (data.length) {
        out.push({event, data: data.join('\n'), id});
      }
    }
    return out;
  }
}

export type StreamStatus = 'connecting' | 'live' | 'reconnecting';

export type StreamOptions = {
  url: (after: number) => string;
  getCursor: () => number;
  onEvent: (e: StoredEvent) => void;
  onStatus: (s: StreamStatus) => void;
  stallMs?: number; // no bytes for this long (server pings every 15 s) = dead connection
};

export function openEventStream({url, getCursor, onEvent, onStatus, stallMs = 40_000}: StreamOptions) {
  let xhr: XMLHttpRequest | null = null;
  let stopped = false;
  let everLive = false;
  let isLive = false;
  let backoff = 1000;
  let lastByteAt = Date.now();
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  // graceful: the server ended a healthy stream (its 10-minute limit), so resume at once without showing RECONNECTING.
  const scheduleReconnect = (graceful = false) => {
    if (stopped || retryTimer) {
      return;
    }
    xhr?.abort();
    xhr = null;
    if (!graceful) {
      isLive = false;
      onStatus(everLive ? 'reconnecting' : 'connecting');
    }
    retryTimer = setTimeout(
      () => {
        retryTimer = null;
        connect();
      },
      graceful ? 0 : backoff,
    );
    if (!graceful) {
      backoff = Math.min(backoff * 2, 15_000);
    }
  };

  const connect = () => {
    if (stopped) {
      return;
    }
    const parser = new SSEParser();
    const req = new XMLHttpRequest();
    xhr = req;
    let offset = 0;
    lastByteAt = Date.now();

    const consume = () => {
      const text = req.responseText ?? '';
      if (text.length <= offset) {
        return;
      }
      const chunk = text.slice(offset);
      offset = text.length;
      lastByteAt = Date.now();
      if (req.status === 200 && !isLive) {
        isLive = true;
        everLive = true;
        backoff = 1000;
        onStatus('live');
      }
      for (const m of parser.push(chunk)) {
        if (m.event === 'ping') {
          continue;
        }
        try {
          onEvent(JSON.parse(m.data) as StoredEvent);
        } catch (err) {
          console.warn('[homebase] bad event', m.event, String(err));
        }
      }
    };

    req.onprogress = consume;
    req.onreadystatechange = () => {
      if (xhr !== req) {
        return;
      }
      if (req.readyState >= 3) {
        consume();
      }
      if (req.readyState === 4) {
        // End of a 10-minute stream (200 with data) or an HTTP/network error: either way, resume from the cursor.
        scheduleReconnect(req.status === 200 && offset > 0);
      }
    };
    req.onerror = () => {
      if (xhr === req) {
        scheduleReconnect();
      }
    };
    req.open('GET', url(getCursor()));
    req.setRequestHeader('Accept', 'text/event-stream');
    req.setRequestHeader('Cache-Control', 'no-cache');
    req.send();
  };

  const watchdog = setInterval(() => {
    if (xhr && Date.now() - lastByteAt > stallMs) {
      console.warn('[homebase] event stream stalled; reconnecting');
      scheduleReconnect();
    }
  }, 5000);

  onStatus('connecting');
  connect();

  return {
    close() {
      stopped = true;
      clearInterval(watchdog);
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      xhr?.abort();
      xhr = null;
    },
  };
}
