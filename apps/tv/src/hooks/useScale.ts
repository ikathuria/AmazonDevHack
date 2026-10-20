// Maps the 1920x1080 design canvas (tokens.size, docs/04 §3) onto the real window.
// The Vega Virtual Device reports 960x540 dp at 2x density, so k = 0.5 there.
import {useWindowDimensions} from 'react-native';
import {CANVAS} from '../theme/theme';

export function useScale(): number {
  const {width, height} = useWindowDimensions();
  return Math.min(width / CANVAS.width, height / CANVAS.height) || 1;
}
