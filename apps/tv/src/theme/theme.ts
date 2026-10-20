// "Dinner Departures" theme (docs/BRAND.md). Every value comes from tokens.json, a copy of design/tokens.json
// made by scripts/sync-tokens.js before each build. Sizes are for the 1920x1080 canvas; useScale() maps them to the screen.
import {Easing} from 'react-native';
import tokens from './tokens.json';

export const color = tokens.color;
export const size = tokens.size;
export const space = tokens.space;
export const radius = tokens.radius;
export const border = tokens.border;
export const motion = tokens.motion;

export const CANVAS = {width: 1920, height: 1080};

// Vega loads assets/fonts/<family>.ttf by family name, and each static weight ships as its own family
// ("Archivo Medium", "Archivo Black", ...), so a weight is picked by family rather than fontWeight.
const weightName: Record<number, string> = {500: 'Medium', 800: 'ExtraBold', 900: 'Black'};
export const font = {
  display: `${tokens.font.display} ${weightName[tokens.font.weight.regular]}`,
  displayBlack: `${tokens.font.display} ${weightName[tokens.font.weight.black]}`,
  mono: `${tokens.font.mono} ${weightName[tokens.font.weight.regular]}`,
  monoHeavy: `${tokens.font.mono} ${weightName[tokens.font.weight.heavy]}`,
};

// JetBrains Mono advances are 600/1000 em, so a mono string's width is predictable (used for strike-throughs).
export const MONO_ADVANCE = 0.6;

// tokens.motion.easing is a CSS cubic-bezier(); Animated needs the four numbers.
const bez = /cubic-bezier\(([^)]+)\)/.exec(tokens.motion.easing);
const [x1, y1, x2, y2] = bez ? bez[1].split(',').map(Number) : [0.2, 0.8, 0.2, 1];
export const easing = Easing.bezier(x1, y1, x2, y2);
