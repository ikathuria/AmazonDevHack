/* eslint-env es2020 */
import {openEventStream, SSEParser, type StreamStatus} from '../src/api/sse';
import type {StoredEvent} from '../src/api/types';

const frame = (seq: number, type: string, body: object) =>
  `id: ${seq}\nevent: ${type}\ndata: ${JSON.stringify({seq, at: 'x', event: {type, ...body}})}\n\n`;

describe('SSEParser', () => {
  it('parses messages split across chunks, with CRLF, comments and pings', () => {
    const p = new SSEParser();
    const text = `: hello\r\n\r\n${frame(1, 'voice.heard', {utterance: 'hi'})}event: ping\ndata: 123\n\n`;
    const out = [...p.push(text.slice(0, 20)), ...p.push(text.slice(20, 61)), ...p.push(text.slice(61))];
    expect(out.map((m) => [m.event, m.id])).toEqual([
      ['voice.heard', '1'],
      ['ping', undefined],
    ]);
    expect(JSON.parse(out[0].data).event.utterance).toBe('hi');
  });

  it('joins multi-line data', () => {
    expect(new SSEParser().push('data: a\ndata: b\n\n')).toEqual([{event: 'message', data: 'a\nb', id: undefined}]);
  });
});

// Minimal XMLHttpRequest stand-in: tests feed it response text the way Vega's networking does (readyState 3).
class FakeXHR {
  static all: FakeXHR[] = [];
  readyState = 0;
  status = 0;
  responseText = '';
  url = '';
  aborted = false;
  onprogress: (() => void) | null = null;
  onreadystatechange: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    FakeXHR.all.push(this);
  }
  open(_m: string, url: string) {
    this.url = url;
  }
  setRequestHeader() {}
  send() {}
  abort() {
    this.aborted = true;
  }
  feed(text: string) {
    this.status = 200;
    this.readyState = 3;
    this.responseText += text;
    this.onreadystatechange?.();
    this.onprogress?.();
  }
  end(status = 200) {
    this.status = status;
    this.readyState = 4;
    this.onreadystatechange?.();
  }
}

describe('openEventStream', () => {
  const realXHR = globalThis.XMLHttpRequest;
  beforeEach(() => {
    jest.useFakeTimers();
    FakeXHR.all = [];
    (globalThis as any).XMLHttpRequest = FakeXHR;
  });
  afterEach(() => {
    jest.useRealTimers();
    (globalThis as any).XMLHttpRequest = realXHR;
  });

  function start() {
    let cursor = 7;
    const events: StoredEvent[] = [];
    const statuses: StreamStatus[] = [];
    const stream = openEventStream({
      url: (after) => `https://x/events?after=${after}`,
      getCursor: () => cursor,
      onEvent: (e) => {
        events.push(e);
        cursor = e.seq;
      },
      onStatus: (s) => statuses.push(s),
    });
    return {stream, events, statuses};
  }

  it('streams events, skips pings, and resumes from the cursor after the server ends the stream', () => {
    const {stream, events, statuses} = start();
    expect(FakeXHR.all[0].url).toBe('https://x/events?after=7');
    FakeXHR.all[0].feed(frame(8, 'voice.heard', {utterance: 'next step'}));
    FakeXHR.all[0].feed('event: ping\ndata: 1\n\n');
    expect(events.map((e) => e.seq)).toEqual([8]);
    expect(statuses).toEqual(['connecting', 'live']);

    FakeXHR.all[0].end(200); // the 10-minute Lambda limit: reconnect at once, no RECONNECTING flash
    jest.advanceTimersByTime(0);
    expect(FakeXHR.all[1].url).toBe('https://x/events?after=8');
    FakeXHR.all[1].feed(frame(9, 'voice.heard', {utterance: 'x'}));
    expect(statuses).toEqual(['connecting', 'live']);
    stream.close();
  });

  it('shows RECONNECTING on errors and backs off', () => {
    const {stream, statuses} = start();
    FakeXHR.all[0].feed('event: ping\ndata: 1\n\n');
    FakeXHR.all[0].onerror?.();
    expect(statuses).toEqual(['connecting', 'live', 'reconnecting']);
    jest.advanceTimersByTime(1000);
    expect(FakeXHR.all).toHaveLength(2);
    FakeXHR.all[1].end(502);
    jest.advanceTimersByTime(1999);
    expect(FakeXHR.all).toHaveLength(2);
    jest.advanceTimersByTime(1);
    expect(FakeXHR.all).toHaveLength(3);
    FakeXHR.all[2].feed('event: ping\ndata: 1\n\n');
    expect(statuses.at(-1)).toBe('live');
    stream.close();
  });

  it('reconnects a stalled stream (no bytes, not even pings, for 40 s)', () => {
    const {stream} = start();
    FakeXHR.all[0].feed('event: ping\ndata: 1\n\n');
    jest.advanceTimersByTime(45_000);
    expect(FakeXHR.all[0].aborted).toBe(true);
    jest.advanceTimersByTime(1000);
    expect(FakeXHR.all).toHaveLength(2);
    stream.close();
    expect(FakeXHR.all[1].aborted).toBe(true);
  });
});
