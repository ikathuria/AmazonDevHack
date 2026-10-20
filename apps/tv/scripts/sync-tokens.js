// Copies the brand tokens (design/tokens.json, the source of truth) into the app so Metro can bundle them.
// Runs before every build. `--check` exits non-zero if the copy is out of date instead of writing it.
const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '../../../design/tokens.json');
const target = path.resolve(__dirname, '../src/theme/tokens.json');

const want = fs.readFileSync(source, 'utf8');
const have = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';

if (process.argv.includes('--check')) {
  if (want !== have) {
    console.error('src/theme/tokens.json is out of date; run `npm run sync-tokens`.');
    process.exit(1);
  }
} else if (want !== have) {
  fs.writeFileSync(target, want);
  console.log('Synced design/tokens.json -> src/theme/tokens.json');
}
