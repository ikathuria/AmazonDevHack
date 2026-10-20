// Split-flap text (BRAND.md signature move 1): when the value changes, each changed character folds shut and opens
// on its new value, left to right (flapMs 70, stagger 25). Mono font, so every character cell has the same width.
import React, {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, View, type StyleProp, type TextStyle} from 'react-native';
import {motion} from '../theme/theme';

type Props = {text: string; style: StyleProp<TextStyle>; reduceMotion: boolean; testID?: string};

const NBSP = ' ';

export function FlapText({text, style, reduceMotion, testID}: Props) {
  const [chars, setChars] = useState<string[]>(() => (reduceMotion ? [...text] : []));
  const shown = useRef<string[]>(chars);
  const scales = useRef<Animated.Value[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const generation = useRef(0);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const gen = ++generation.current; // a newer value cancels flips still finishing from the old one
    const target = [...text];
    const setAt = (i: number, c: string) => {
      if (gen !== generation.current) {
        return;
      }
      shown.current = [...shown.current];
      shown.current[i] = c;
      setChars(shown.current);
    };
    if (reduceMotion) {
      shown.current = target;
      scales.current.forEach((s) => s.setValue(1));
      setChars(target);
      return;
    }
    const len = Math.max(target.length, shown.current.length);
    while (scales.current.length < len) {
      scales.current.push(new Animated.Value(1));
    }
    shown.current = Array.from({length: len}, (_, i) => shown.current[i] ?? ' ');
    setChars(shown.current);
    const half = motion.flapMs / 2;
    let last = 0;
    for (let i = 0; i < len; i++) {
      const want = target[i] ?? ' ';
      if (shown.current[i] === want) {
        continue;
      }
      last = i * motion.flapStaggerMs;
      timers.current.push(
        setTimeout(() => {
          const s = scales.current[i];
          Animated.timing(s, {toValue: 0, duration: half, useNativeDriver: true}).start(() => {
            setAt(i, want);
            Animated.timing(s, {toValue: 1, duration: half, useNativeDriver: true}).start();
          });
        }, last),
      );
    }
    // Drop trailing blanks once a shorter value has finished flapping in.
    timers.current.push(
      setTimeout(() => {
        shown.current = target;
        setChars(target);
      }, last + motion.flapMs + 20),
    );
  }, [text, reduceMotion]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <View style={styles.row} testID={testID} accessible accessibilityLabel={text}>
      {chars.map((c, i) => (
        <Animated.Text key={i} style={[style, {transform: [{scaleY: scales.current[i] ?? 1}]}]}>
          {c === ' ' ? NBSP : c}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', overflow: 'hidden', flexShrink: 1},
});
