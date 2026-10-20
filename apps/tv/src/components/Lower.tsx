// Lower half of the board. Left: the cook-along step and timer, or the last thing Alexa heard.
// Right: the hero callout (tonight's dishes person in 120px amber) and the shopping line.
import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNow} from '../hooks/useNow';
import type {CookView, Hero} from '../logic/board';
import {countdownLabel} from '../logic/time';
import {color, font, size, space} from '../theme/theme';

type Props = {
  cook: CookView;
  heard: string | null;
  timerEndsAt: number | null;
  hero: Hero;
  shopping: {items: string; more: number} | null;
  k: number;
};

export function Lower({cook, heard, timerEndsAt, hero, shopping, k}: Props) {
  const s = useMemo(() => makeStyles(k), [k]);
  return (
    <View style={s.lower}>
      <View style={s.cook}>
        {cook ? (
          <>
            <Text style={s.label} numberOfLines={1}>
              {cook.label}
            </Text>
            <Text style={s.step} numberOfLines={3} testID="cook-step">
              {cook.step}
            </Text>
            {timerEndsAt ? <Timer endsAt={timerEndsAt} s={s} /> : null}
          </>
        ) : (
          <Text style={s.heard} numberOfLines={2}>
            {heard ? 'Heard: ' : 'Say '}
            <Text style={s.heardWords}>{heard ? `“${heard}”` : '“Alexa, ask Homebase to plan dinners this week.”'}</Text>
          </Text>
        )}
      </View>
      <View style={s.hero}>
        {hero ? (
          <>
            <Text style={[s.label, s.right]}>{hero.label}</Text>
            <Text style={s.who} numberOfLines={1} testID="hero-name">
              {hero.name}
            </Text>
          </>
        ) : null}
        {shopping ? (
          <Text style={[s.shop, s.right]} numberOfLines={1}>
            SHOPPING · <Text style={s.shopItems}>{shopping.items}</Text>
            {shopping.more ? ` +${shopping.more}` : ''}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// Counts down to the step timer; at zero it turns red. It stays on TIME'S UP until the next step or timer.
function Timer({endsAt, s}: {endsAt: number; s: ReturnType<typeof makeStyles>}) {
  const now = useNow(500);
  const t = countdownLabel(endsAt, now);
  return (
    <Text style={[s.timer, t.done && s.timerDone]} testID="timer">
      {t.text}
    </Text>
  );
}

function makeStyles(k: number) {
  return StyleSheet.create({
    lower: {flexDirection: 'row', alignItems: 'flex-end', gap: space.lg * k, paddingTop: space.md * k},
    cook: {flex: 1, minWidth: 0},
    label: {fontFamily: font.mono, fontSize: size.label * k, color: color.dim, letterSpacing: 4 * k},
    right: {textAlign: 'right'},
    step: {
      fontFamily: font.display,
      fontSize: size.row * k,
      lineHeight: size.row * 1.25 * k,
      color: color.paper,
      marginTop: 10 * k,
    },
    timer: {fontFamily: font.monoHeavy, fontSize: size.clock * k, color: color.amber, marginTop: 6 * k},
    timerDone: {color: color.red},
    heard: {fontFamily: font.display, fontSize: size.body * k, color: color.dim},
    heardWords: {color: color.paper},
    hero: {maxWidth: 760 * k, alignItems: 'flex-end'},
    who: {
      fontFamily: font.displayBlack,
      fontSize: size.hero * k,
      lineHeight: size.hero * 1.05 * k,
      color: color.amber,
    },
    shop: {
      fontFamily: font.mono,
      fontSize: size.label * k,
      color: color.dim,
      letterSpacing: 2 * k,
      marginTop: space.sm * k,
    },
    shopItems: {color: color.paper},
  });
}
