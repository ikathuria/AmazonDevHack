// Loads the household snapshot once, then follows the live event stream (docs/04-tv-handoff.md §4).
import {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {fetchState, HouseholdNotFound} from '../api/client';
import {eventsUrl} from '../api/config';
import {openEventStream, type StreamStatus} from '../api/sse';
import {initialModel, reducer} from '../logic/model';

export type Connection = StreamStatus | 'offline' | 'not-found';

export function useBoard() {
  const [model, dispatch] = useReducer(reducer, initialModel);
  const [connection, setConnection] = useState<Connection>('connecting');
  const cursorRef = useRef(0);
  cursorRef.current = model.cursor;
  const loaded = model.state !== null;

  // first: before the stream exists, a failure is what the status line should say. Later refetches leave the
  // status to the stream.
  const load = useCallback(async (first: boolean): Promise<boolean> => {
    try {
      const state = await fetchState();
      dispatch({type: 'loaded', state, nowMs: Date.now()});
      return true;
    } catch (err) {
      if (first) {
        setConnection(err instanceof HouseholdNotFound ? 'not-found' : 'offline');
      }
      console.warn('[homebase] state load failed', String(err));
      return false;
    }
  }, []);

  // Retries every 3 s until the server answers (the TV may boot before Wi-Fi is up).
  const loadUntilDone = useCallback(
    (first: boolean) => {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const attempt = async () => {
        if (!(await load(first)) && !cancelled) {
          timer = setTimeout(attempt, 3000);
        }
      };
      attempt();
      return () => {
        cancelled = true;
        if (timer !== undefined) {
          clearTimeout(timer);
        }
      };
    },
    [load],
  );

  useEffect(() => (loaded ? undefined : loadUntilDone(true)), [loaded, loadUntilDone]);

  // The stream opens after the snapshot, from its lastSeq, and lives as long as the app.
  useEffect(() => {
    if (!loaded) {
      return;
    }
    const stream = openEventStream({
      url: eventsUrl,
      getCursor: () => cursorRef.current,
      onEvent: (event) => dispatch({type: 'event', event}),
      onStatus: setConnection,
    });
    return () => stream.close();
  }, [loaded]);

  // A cook.step for a different recipe: fetch its title and steps.
  useEffect(() => (model.needsRefetch ? loadUntilDone(false) : undefined), [model.needsRefetch, loadUntilDone]);

  return {model, connection};
}
