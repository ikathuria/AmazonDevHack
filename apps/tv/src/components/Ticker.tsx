// Red alert ticker (BRAND.md; safety only): slides up full-bleed at the bottom, scrolls right to left at
// tickerPxPerSec, and hides 20 s after the last alert (or after one full pass, if that takes longer).
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Animated, Easing, StyleSheet, Text} from 'react-native';
import type {Alert} from '../logic/model';
import {CANVAS, color, easing, font, motion} from '../theme/theme';

export const TICKER_HEIGHT = 90;
const HIDE_AFTER_MS = 20_000;
const TEXT_SIZE = 36;
const TEXT_LINE = TEXT_SIZE * 1.3;

type Props = {alert: Alert | null; k: number; reduceMotion: boolean};

export function Ticker({alert, k, reduceMotion}: Props) {
  const s = useMemo(() => makeStyles(k), [k]);
  const lift = useRef(new Animated.Value(0)).current; // 0 hidden, 1 shown
  const x = useRef(new Animated.Value(0)).current;
  const [textW, setTextW] = useState(0);
  const [shown, setShown] = useState<Alert | null>(null);

  // A new alert: show it and schedule the hide.
  useEffect(() => {
    if (!alert) {
      return;
    }
    setShown(alert);
    setTextW(0);
    Animated.timing(lift, {toValue: 1, duration: reduceMotion ? 0 : motion.rowSlideMs, easing, useNativeDriver: true}).start();
  }, [alert, lift, reduceMotion]);

  // Once the text is measured, scroll it and hide after max(20 s, one pass).
  useEffect(() => {
    if (!shown || !textW) {
      return;
    }
    const screenW = CANVAS.width * k;
    const passMs = ((screenW + textW) / (motion.tickerPxPerSec * k)) * 1000;
    let loop: Animated.CompositeAnimation | null = null;
    if (reduceMotion) {
      x.setValue(Math.max(0, (screenW - textW) / 2));
    } else {
      x.setValue(screenW);
      loop = Animated.loop(
        Animated.timing(x, {toValue: -textW, duration: passMs, easing: Easing.linear, useNativeDriver: true}),
      );
      loop.start();
    }
    const hide = setTimeout(
      () => {
        Animated.timing(lift, {toValue: 0, duration: reduceMotion ? 0 : motion.rowSlideMs, easing, useNativeDriver: true}).start(
          () => {
            loop?.stop();
            setShown(null);
          },
        );
      },
      Math.max(HIDE_AFTER_MS, passMs + 1000),
    );
    return () => {
      clearTimeout(hide);
      loop?.stop();
    };
  }, [shown, textW, k, reduceMotion, lift, x]);

  if (!shown) {
    return null;
  }
  const translateY = lift.interpolate({inputRange: [0, 1], outputRange: [TICKER_HEIGHT * k, 0]});
  return (
    <Animated.View style={[s.bar, {transform: [{translateY}]}]} testID="ticker" accessibilityLiveRegion="assertive">
      {/* A very wide track so the text never wraps; the Text hugs its content so onLayout gives its real width. */}
      <Animated.View style={[s.track, {transform: [{translateX: x}]}]}>
        <Text style={s.text} numberOfLines={1} onLayout={(e) => setTextW(e.nativeEvent.layout.width)}>
          {shown.text}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

function makeStyles(k: number) {
  return StyleSheet.create({
    bar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: TICKER_HEIGHT * k,
      backgroundColor: color.red,
      overflow: 'hidden',
    },
    track: {
      position: 'absolute',
      left: 0,
      top: ((TICKER_HEIGHT - TEXT_LINE) / 2) * k,
      width: 8000 * k,
      flexDirection: 'row',
    },
    text: {fontFamily: font.monoHeavy, fontSize: TEXT_SIZE * k, lineHeight: TEXT_LINE * k, color: color.onAccent},
  });
}
