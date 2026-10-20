// design/tokens.json is the brand's source of truth; the app's copy must match it (npm run sync-tokens).
import source from '../../../design/tokens.json';
import copy from '../src/theme/tokens.json';
import {font} from '../src/theme/theme';

// Node built-ins, loaded through Jest so the app's React Native type setup doesn't need Node types.
const fs = jest.requireActual('fs');
const path = jest.requireActual('path');
declare const __dirname: string;

describe('brand tokens', () => {
  it('bundles an up-to-date copy of design/tokens.json', () => {
    expect(copy).toEqual(source);
  });

  it('ships a font file for every family the theme uses (Vega loads assets/fonts/<family>.ttf)', () => {
    for (const family of Object.values(font)) {
      expect(fs.existsSync(path.resolve(__dirname, `../assets/fonts/${family}.ttf`))).toBe(true);
    }
  });
});
