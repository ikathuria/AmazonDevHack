// D-pad controls (docs/04 §4.4, §5): flap-tile buttons that call the same tools Alexa uses, plus the live indicator.
// Focus starts on NEXT ▶; a focused button gets a 4px amber outline 4px out (BRAND.md focus rule), visible at 3 m.
import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import type {Connection} from '../hooks/useBoard';
import {color, font, radius, size, space} from '../theme/theme';

export type ControlButton = {tool: string; label: string};

export const COOK_BUTTONS: ControlButton[] = [
  {tool: 'start_cooking', label: 'START'},
  {tool: 'previous_step', label: '◀ BACK'},
  {tool: 'repeat_step', label: 'REPEAT'},
  {tool: 'next_step', label: 'NEXT ▶'},
  {tool: 'start_timer', label: 'TIMER'},
];
export const HOUSE_BUTTONS: ControlButton[] = [
  {tool: 'plan_week', label: 'PLAN WEEK'},
  {tool: 'assign_chores', label: 'SPLIT CHORES'},
  {tool: 'shopping_list', label: 'SHOPPING'},
];
const FIRST_FOCUS = 'next_step';

const CONNECTION_LABEL: Record<Connection, string> = {
  connecting: 'CONNECTING',
  live: '● LIVE',
  reconnecting: 'RECONNECTING…',
  offline: "CAN'T REACH HOMEBASE",
  'not-found': 'HOUSEHOLD NOT FOUND',
};

type Props = {onPress: (tool: string) => void; busy: string | null; connection: Connection; k: number};

export function Controls({onPress, busy, connection, k}: Props) {
  const s = useMemo(() => makeStyles(k), [k]);
  const button = (b: ControlButton) => (
    <FocusButton key={b.tool} b={b} s={s} busy={busy === b.tool} onPress={() => onPress(b.tool)} />
  );
  return (
    <TVFocusGuideView style={s.controls} autoFocus trapFocusLeft trapFocusRight trapFocusUp trapFocusDown>
      {COOK_BUTTONS.map(button)}
      <View style={s.sep} />
      {HOUSE_BUTTONS.map(button)}
      <Text style={[s.live, connection !== 'live' && s.liveOff]} testID="connection">
        {CONNECTION_LABEL[connection]}
      </Text>
    </TVFocusGuideView>
  );
}

function FocusButton({b, s, busy, onPress}: {b: ControlButton; s: Styles; busy: boolean; onPress: () => void}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hasTVPreferredFocus={b.tool === FIRST_FOCUS}
      accessibilityRole="button"
      accessibilityLabel={b.label}
      testID={`btn-${b.tool}`}
      style={[s.ring, focused && s.ringOn]}>
      <View style={[s.button, focused && s.buttonOn]}>
        <Text style={[s.label, busy && s.labelBusy]}>{b.label}</Text>
      </View>
    </Pressable>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(k: number) {
  const ring = 4 * k; // outline width, and the 4px gap between outline and tile
  return StyleSheet.create({
    // No gap: each tile's ring (border + padding, 8px a side) already spaces the tiles 16px (space.sm) apart.
    controls: {flexDirection: 'row', alignItems: 'center', marginTop: (space.md - 8) * k},
    sep: {flex: 1},
    ring: {borderWidth: ring, borderColor: 'transparent', padding: ring},
    ringOn: {borderColor: color.amber},
    button: {backgroundColor: color.flap, borderRadius: radius.flap * k, paddingVertical: 10 * k, paddingHorizontal: 18 * k},
    buttonOn: {backgroundColor: color.row},
    label: {fontFamily: font.monoHeavy, fontSize: size.label * k, letterSpacing: 2 * k, color: color.paper},
    labelBusy: {color: color.dim},
    live: {fontFamily: font.mono, fontSize: size.label * k, letterSpacing: 3 * k, color: color.dim, marginLeft: space.sm * k},
    liveOff: {color: color.amber},
  });
}
