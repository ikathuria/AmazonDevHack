// Privacy policy and terms of use for the Alexa+ add-on listing (addon.json requires HTTPS URLs for both).
// Plain and specific to what the code actually does. Review before certification (PLAN.md M7).
const page = (title: string, body: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>:root{--bg:#f6f4ef;--ink:#1d2321;--muted:#5d6763}@media (prefers-color-scheme:dark){:root{--bg:#121615;--ink:#ecefed;--muted:#9aa6a1}}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,sans-serif}main{max-width:720px;margin:0 auto;padding:24px 16px}h1{font-size:24px}h2{font-size:18px;margin-top:28px}small{color:var(--muted)}</style></head><body><main>${body}</main></body></html>`;

export const PRIVACY_PAGE = page("Homebase privacy policy", `
<h1>Homebase privacy policy</h1>
<small>Last updated 2026-10-11. Homebase is a hackathon project in development.</small>
<h2>What we store</h2>
<p>For each household: member first names and roles; allergies, diets and food dislikes you tell Homebase; your pantry list; chores and the weekly chore rota; recipes; the weekly dinner plan; your shopping list; and the current cooking step and timer. Homebase also keeps a short-lived log of board updates (for example "plan updated" or the last thing Alexa heard) so your TV can catch up. These log entries are deleted automatically after 7 days.</p>
<h2>What we don't store</h2>
<p>No voice recordings, no payment details, no location, no contacts. Homebase receives only the request Alexa+ sends to its tools.</p>
<h2>Where it goes</h2>
<p>Data is stored in Amazon Web Services (DynamoDB, US East). To draft a weekly dinner plan, Homebase sends your household summary (names, allergies, diets, house rules), pantry item names and recipe titles to a language model on Amazon Bedrock. That request is not stored by Homebase. We don't sell or share household data, and there are no ads or third-party trackers.</p>
<h2>Your controls</h2>
<p>Ask "Alexa, export my Homebase data" to get a copy of everything as JSON, or "Alexa, delete my Homebase data" to erase it all (Homebase asks you to confirm first). Contact: open an issue at github.com/ikathuria/AmazonDevHack.</p>
<h2>Allergy safety</h2>
<p>Homebase checks recipes against the allergies you record, but it is not a medical service. Always check ingredient labels.</p>`);

export const TERMS_PAGE = page("Homebase terms of use", `
<h1>Homebase terms of use</h1>
<small>Last updated 2026-10-11.</small>
<p>Homebase is provided free, as is, for personal household use while it is in development. It may change or stop working.</p>
<p>Meal plans, recipes and allergy checks are suggestions. Homebase screens recipes against the allergies and diets you record, but you are responsible for checking ingredients and food safety. It is not medical advice.</p>
<p>Don't use Homebase to store other people's information without their permission. You can export or delete your household's data at any time.</p>
<p>Source code is MIT-licensed: github.com/ikathuria/AmazonDevHack.</p>`);
