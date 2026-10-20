// Homebase Kitchen Board for Fire TV (Vega): the "Dinner Departures" family board.
// Spec: docs/04-tv-handoff.md. Look: docs/BRAND.md + design/tokens.json. Reference: apps/server/src/board-page.ts.
// Data: one snapshot from GET /households/patels/state, then the live SSE feed; D-pad buttons call the same tools
// Alexa does, and the board updates from the feed.
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useKeplerBackHandler, useTVEventHandler, type HWEvent} from '@amazon-devices/react-native-kepler';
import {callTool} from './api/client';
import {BoardTable} from './components/BoardTable';
import {Controls} from './components/Controls';
import {Header} from './components/Header';
import {Lower} from './components/Lower';
import {Ticker, TICKER_HEIGHT} from './components/Ticker';
import {Toast, type ToastMessage} from './components/Toast';
import {useBoard} from './hooks/useBoard';
import {useNow} from './hooks/useNow';
import {useReduceMotion} from './hooks/useReduceMotion';
import {useScale} from './hooks/useScale';
import {buildCook, buildHero, buildRows, shoppingLine, title} from './logic/board';
import {localNow} from './logic/time';
import {CANVAS, color, space} from './theme/theme';

const DEFAULT_TZ = 'America/Chicago';

export const App = () => {
  const k = useScale();
  const reduceMotion = useReduceMotion();
  const {model, connection} = useBoard();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Rows depend on the household's day, which only changes at midnight; checking every 30 s is plenty.
  const minute = useNow(30_000);
  const state = model.state;
  const tz = state?.household.timezone ?? DEFAULT_TZ;
  const local = useMemo(() => localNow(new Date(minute), tz), [minute, tz]);

  const rows = useMemo(
    () => (state ? buildRows(state, model.cancellations, local) : []),
    [state, model.cancellations, local],
  );
  const hero = useMemo(() => (state ? buildHero(state, local) : null), [state, local]);
  const cook = useMemo(() => (state ? buildCook(state) : null), [state]);
  const shopping = useMemo(() => (state ? shoppingLine(state) : null), [state]);

  const press = useCallback(async (tool: string) => {
    setBusy(tool);
    const reply = await callTool(tool);
    setBusy((b) => (b === tool ? null : b));
    if (reply.text) {
      setToast((t) => ({id: (t?.id ?? 0) + 1, text: reply.text}));
    }
  }, []);

  // Play/Pause = next step, for flour-covered hands (docs/04 §5). Act on key-down only (eventKeyAction 0).
  const onRemote = useCallback(
    (evt: HWEvent) => {
      if (evt.eventType === 'playpause' && evt.eventKeyAction === 0) {
        press('next_step');
      }
    },
    [press],
  );
  useTVEventHandler(onRemote);

  // Back does nothing: there's only one screen, and the app must not exit mid-demo.
  const back = useKeplerBackHandler();
  useEffect(() => {
    const sub = back.addEventListener('backPress', () => true);
    return () => sub?.remove(); // the Jest stand-in for this API returns nothing
  }, [back]);

  const s = useMemo(() => makeStyles(k), [k]);
  return (
    <View style={s.screen}>
      <View style={s.stage}>
        <Header title={title(state)} timeZone={tz} k={k} />
        <BoardTable rows={rows} k={k} reduceMotion={reduceMotion} />
        <View style={s.spacer} />
        <Lower cook={cook} heard={model.heard} timerEndsAt={model.timerEndsAt} hero={hero} shopping={shopping} k={k} />
        <Controls onPress={press} busy={busy} connection={connection} k={k} />
        <Toast message={toast} k={k} />
        <Ticker alert={model.alert} k={k} reduceMotion={reduceMotion} />
      </View>
    </View>
  );
};

function makeStyles(k: number) {
  return StyleSheet.create({
    screen: {flex: 1, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center'},
    // The 1920x1080 canvas at scale k, with the title-safe padding and room for the ticker at the bottom.
    stage: {
      width: CANVAS.width * k,
      height: CANVAS.height * k,
      backgroundColor: color.bg,
      paddingHorizontal: space.safeX * k,
      paddingTop: space.safeY * k,
      paddingBottom: (TICKER_HEIGHT + space.md) * k,
      overflow: 'hidden',
    },
    spacer: {flex: 1},
  });
}
