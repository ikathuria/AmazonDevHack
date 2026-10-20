// Departure board: DAY · DINNER · STATUS rows (BRAND.md BoardRow). Tonight's row is lit amber, a cancelled dinner is
// dimmed and struck through with a red status, and new rows slide in (rowSlideMs).
import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import type {BoardRow} from '../logic/board';
import {color, easing, font, MONO_ADVANCE, motion, size, space} from '../theme/theme';
import {FlapText} from './FlapText';

type Props = {rows: BoardRow[]; k: number; reduceMotion: boolean};

// Column widths on the 1920 canvas (same grid as the /board page: 160px · flexible · 600px).
const DAY_W = 160;
const STATUS_W = 600;
const ROW_PAD_Y = 14;
const ROW_GAP = 10;

export function BoardTable({rows, k, reduceMotion}: Props) {
  const s = useMemo(() => makeStyles(k), [k]);
  return (
    <View>
      <View style={s.heads}>
        <Text style={[s.head, s.day]}>DAY</Text>
        <Text style={[s.head, s.dinner]}>DINNER</Text>
        <Text style={[s.head, s.status]}>STATUS</Text>
      </View>
      <View style={s.board}>
        {rows.map((r) => (
          <Row key={r.key} row={r} s={s} k={k} reduceMotion={reduceMotion} />
        ))}
      </View>
    </View>
  );
}

function Row({row, s, k, reduceMotion}: {row: BoardRow; s: Styles; k: number; reduceMotion: boolean}) {
  const enter = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(enter, {toValue: 1, duration: motion.rowSlideMs, easing, useNativeDriver: true}).start();
  }, [enter]);

  const now = row.kind === 'now';
  const cancelled = row.kind === 'cancelled';
  const dim = cancelled || row.kind === 'past';
  const textStyle = [s.cell, now && s.nowText, dim && s.dimText];
  const statusStyle = [
    ...textStyle,
    row.tone === 'ok' && !now && s.okText,
    row.tone === 'alert' && s.alertText,
  ];
  const slide = {
    opacity: enter,
    transform: [{translateY: enter.interpolate({inputRange: [0, 1], outputRange: [-12 * k, 0]})}],
  };

  return (
    <Animated.View style={[s.row, now && s.nowRow, slide]} testID={`row-${row.key}`}>
      <Text style={[...textStyle, s.day]} numberOfLines={1}>
        {row.day.toUpperCase()}
      </Text>
      <View style={s.dinner}>
        {cancelled ? (
          <View style={s.struck}>
            <Text style={textStyle} numberOfLines={1}>
              {row.dinner}
            </Text>
            {/* RN on Vega has no text-decoration color, so the red strike is a 4px rule across the text */}
            <View style={[s.strike, {width: row.dinner.length * MONO_ADVANCE * size.row * k}]} />
          </View>
        ) : (
          <FlapText text={row.dinner} style={textStyle} reduceMotion={reduceMotion} />
        )}
      </View>
      <View style={s.status}>
        {cancelled ? (
          <Text style={statusStyle} numberOfLines={1}>
            {row.status}
          </Text>
        ) : (
          <FlapText text={row.status} style={statusStyle} reduceMotion={reduceMotion} />
        )}
      </View>
    </Animated.View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(k: number) {
  return StyleSheet.create({
    heads: {flexDirection: 'row', marginTop: space.md * k, paddingHorizontal: space.md * k},
    head: {fontFamily: font.mono, fontSize: size.label * k, color: color.dim, letterSpacing: 4 * k},
    board: {marginTop: ROW_GAP * k, gap: ROW_GAP * k},
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: color.row,
      paddingVertical: ROW_PAD_Y * k,
      paddingHorizontal: space.md * k,
    },
    nowRow: {backgroundColor: color.amber},
    day: {width: DAY_W * k},
    dinner: {flex: 1, overflow: 'hidden', paddingRight: space.md * k},
    status: {width: STATUS_W * k, overflow: 'hidden'},
    cell: {fontFamily: font.mono, fontSize: size.row * k, lineHeight: size.row * 1.3 * k, color: color.paper},
    nowText: {fontFamily: font.monoHeavy, color: color.onAccent},
    dimText: {color: color.dim},
    okText: {color: color.green},
    alertText: {fontFamily: font.monoHeavy, color: color.red},
    struck: {justifyContent: 'center', alignSelf: 'flex-start', maxWidth: '100%'},
    strike: {position: 'absolute', left: 0, height: 4 * k, backgroundColor: color.red, maxWidth: '100%'},
  });
}
