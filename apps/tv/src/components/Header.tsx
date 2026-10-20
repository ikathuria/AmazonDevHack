// Header bar: amber platform square + "THE PATELS · DINNER DEPARTURES", the household-time clock, and a 4px amber rule.
import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNow} from '../hooks/useNow';
import {clockLabel, localNow} from '../logic/time';
import {border, color, font, size} from '../theme/theme';

type Props = {title: string; timeZone: string; k: number};

export function Header({title, timeZone, k}: Props) {
  const s = useMemo(() => makeStyles(k), [k]);
  return (
    <View style={s.top}>
      <View style={s.square} />
      <Text style={s.title} numberOfLines={1}>
        {title}
      </Text>
      <Clock timeZone={timeZone} style={s.clock} />
    </View>
  );
}

function Clock({timeZone, style}: {timeZone: string; style: object}) {
  const now = useNow(1000);
  return (
    <Text style={style} testID="clock">
      {clockLabel(localNow(new Date(now), timeZone))}
    </Text>
  );
}

function makeStyles(k: number) {
  return StyleSheet.create({
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: border.rule * k,
      borderBottomColor: color.amber,
      paddingBottom: 20 * k,
      gap: 20 * k,
    },
    square: {width: 28 * k, height: 28 * k, backgroundColor: color.amber},
    title: {
      flex: 1,
      fontFamily: font.displayBlack,
      fontSize: size.header * k,
      letterSpacing: 2 * k,
      color: color.paper,
    },
    clock: {fontFamily: font.monoHeavy, fontSize: size.clock * k, color: color.amber, marginLeft: 12 * k},
  });
}
