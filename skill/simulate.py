"""Talks to the dev-stage "home base" skill through Alexa's simulator (one session, kept open between lines)
and prints the resolved intent and what Alexa said. Needs a configured ASK CLI profile.
Usage: python3 skill/simulate.py "ask home base what's for dinner tonight" "next step" ..."""
import json, pathlib, subprocess, sys, time

SID = (pathlib.Path(__file__).parent / "skill-id.txt").read_text().strip()

def ask(*args):
    out = subprocess.run(["ask", "smapi", *args], capture_output=True, text=True)
    text = out.stdout.strip()
    return json.loads(text[text.index("{"):]) if "{" in text else {"error": (out.stderr or text).strip()}

mode = "FORCE_NEW_SESSION"
for utterance in sys.argv[1:]:
    started = ask("simulate-skill", "-s", SID, "-g", "development", "--input-content", utterance, "--device-locale", "en-US", "--session-mode", mode)
    mode = "DEFAULT"
    if "id" not in started:
        print(f"> {utterance}\n  could not start simulation: {started}")
        continue
    for _ in range(30):
        result = ask("get-skill-simulation", "-s", SID, "-g", "development", "-i", started["id"])
        if result.get("status") != "IN_PROGRESS":
            break
        time.sleep(1)
    r = result.get("result") or {}
    invocations = (r.get("skillExecutionInfo") or {}).get("invocations") or []
    intent = invocations[0]["invocationRequest"]["body"]["request"].get("intent", {}).get("name", "-") if invocations else "(skill not invoked)"
    responses = (r.get("alexaExecutionInfo") or {}).get("alexaResponses") or []
    speech = " ".join((a.get("content") or {}).get("caption") or "" for a in responses).strip()
    print(f"> {utterance}\n  intent: {intent}\n  alexa:  {speech or (r.get('error') or {}).get('message') or '(no speech)'}")
