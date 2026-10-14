# Homebase Brand Guidelines: "Dinner Departures"

Tokens live in [`design/tokens.json`](../design/tokens.json). They are the source of truth: never hard-code a hex value or size. Reference preview: [`design/options/option-3-departures.html`](../design/options/option-3-departures.html).

## Essence
The family TV becomes a train-station departure board for dinner. Meals "depart", the one cooking now is lit in amber, and anything unsafe gets **CANCELLED** in red. It should read from across the kitchen, look calm and precise, and carry a wink of humor.

## Voice & copy
- Board copy is UPPERCASE, short and station-like: `ON TIME`, `NOW COOKING · STEP 2/6`, `CANCELLED · ALLERGY`, `REROUTED TO PASTA`.
- Spoken Alexa replies are normal sentence case, warm and direct: "Not the satay. Maya's allergic to peanuts, so I swapped in pasta."
- Always name the person and the reason. Never say "error" or "something went wrong". Say what happened and what was done about it.
- Puns are allowed only within the station metaphor (gate, platform, delayed, rerouted), at most one per screen.

## Logo
A wordmark: `HOMEBASE` in Archivo Black with a small amber square before it, like a platform indicator. Add a mark only after the hackathon.

## Color
| Token | Hex | Use |
|---|---|---|
| `bg` | #0E0F0C | Screen background (warm black, never #000) |
| `row` | #1A1B17 | Board rows |
| `flap` | #24251F | Split-flap character tiles |
| `paper` | #ECE6D8 | Primary text |
| `dim` | #8E8B80 | Labels, column heads, past items (5.1:1 on row) |
| `amber` | #FFB84D | **Now**: tonight's dinner, the current step, the clock. One amber focus per screen |
| `red` | #FF4A3D | **Safety only**: allergen cancellations and the alert ticker. Never decorative |
| `green` | #5BD18B | `ON TIME` / done states |

Text on amber or red uses `onAccent` (#0E0F0C).

## Typography
- **Archivo** (500/900): headers, names, hero words (`ARJUN`).
- **JetBrains Mono** (500/800): every board row, status, clock and ticker. Use tabular alignment.
- Scale on 1920×1080: label 24 · body 32 · row 40 · header 64 · hero 120. Nothing on TV is smaller than 24px.

## Layout & spacing
- Title-safe area: 88px horizontal and 64px vertical padding.
- Structure: header bar (title + clock) with a 4px amber rule underneath, then the board table, a hero callout bottom-right, and the ticker full-bleed at the bottom.
- Rows are separated by 10px gaps, not borders.

## Shape & depth
Square corners everywhere (radius 0, flap tiles 2px). No shadows, gradients or glass. Depth comes only from the `bg` → `row` → `flap` steps.

## Signature moves
1. **Split-flap updates:** when a value changes, its characters flip in sequence (`flapMs` 70, stagger 25).
2. **The cancel:** an unsafe dinner row dims, its status flips to `CANCELLED · ALLERGY` in red, the safe replacement row slides in below it lit amber, and the red ticker runs the reason. This is the demo's hero moment.
3. **Hero name:** the person on duty is set in 120px amber Archivo (`DISHES · GATE SINK / ARJUN`).

## Imagery & iconography
No photos on the board. Icons are limited to a few mono glyphs (⚠ ● →) in token colors. Recipe photos may appear only on the Now Cooking screen, full-bleed on the left with a dark scrim.

## Motion
Use flaps, row slides and the ticker scroll only. Nothing bounces. Under `prefers-reduced-motion` (or the Vega equivalent), skip flips and swap values instantly.

## Components
- **BoardRow:** day · dinner · status. States: default, now (amber fill), cancelled (dim text, red status), done (green status).
- **Ticker:** a red bar that appears only when there's an alert, then hides 20 s after the last one.
- **HeroCallout:** a label plus a 120px name or value.
- **Focus (D-pad):** a 4px amber outline offset 4px, plus a row lift to `flap`. It must be visible at 3 m.

## Do / Don't
- Do keep one amber thing per screen. Don't light several rows at once.
- Do use red only for safety. Don't use red for "late" or "overdue chores" (that's amber).
- Do write `CANCELLED · ALLERGY`. Don't write `Error: constraint violated`.

## Accessibility
- All text pairs are at or above 4.5:1 (paper/row 13.9, amber/bg 11.2, red/row 5.2, onAccent/red 5.8).
- Color is never the only signal: cancelled rows also say `CANCELLED`, and the now row also says `NOW COOKING`.
- Everything is reachable by D-pad and by voice.

## SEO & metadata (web)
Web pages use the same tokens with paper-on-bg. Title format: `Homebase · <page>`. Use the board screenshot as the OG image.
