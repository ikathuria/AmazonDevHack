// BRAND.md: under reduced motion, skip the flaps and swap values instantly.
import {useEffect, useState} from 'react';
import {AccessibilityInfo} from 'react-native';

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => alive && setReduce(r))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (r: boolean) => setReduce(r));
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return reduce;
}
