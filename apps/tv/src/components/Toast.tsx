// Shows a tool's spoken reply ("Step 2 of 5: ...") for 3.5 s after a D-pad press (docs/04 §4.4).
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Animated, StyleSheet, Text} from 'react-native';
import {color, font, size, space} from '../theme/theme';

export type ToastMessage = {id: number; text: string};

export function Toast({message, k}: {message: ToastMessage | null; k: number}) {
  const s = useMemo(() => makeStyles(k), [k]);
  const opacity = useRef(new Animated.Value(0)).current;
  const [text, setText] = useState('');

  useEffect(() => {
    if (!message?.text) {
      return;
    }
    setText(message.text);
    Animated.timing(opacity, {toValue: 1, duration: 200, useNativeDriver: true}).start();
    const t = setTimeout(
      () => Animated.timing(opacity, {toValue: 0, duration: 200, useNativeDriver: true}).start(),
      3500,
    );
    return () => clearTimeout(t);
  }, [message, opacity]);

  return (
    <Animated.View style={[s.toast, {opacity}]} pointerEvents="none" testID="toast">
      <Text style={s.text} numberOfLines={2}>
        {text}
      </Text>
    </Animated.View>
  );
}

function makeStyles(k: number) {
  return StyleSheet.create({
    toast: {
      position: 'absolute',
      left: space.xl * k,
      right: space.xl * k,
      bottom: 180 * k,
      backgroundColor: color.row,
      paddingVertical: space.sm * k,
      paddingHorizontal: space.md * k,
    },
    text: {fontFamily: font.display, fontSize: size.body * k, color: color.paper},
  });
}
