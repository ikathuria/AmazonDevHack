**To:** janet@devpost.com
**Subject:** Build, Ship, Shape: clarification on the Alexa+ track (MCP Preview access waitlisted)

Hi Janet,

I'm entering Build, Ship, Shape on the Alexa+ track (project: Homebase, an Alexa+ MCP add-on for household meal planning, chores and hands-free cooking, with a Fire TV board). Per section 11 of the Official Rules, I'd like a written clarification before the October 23 deadline.

**What happened:** following the Alexa+ "Set Up Your Development Environment" guide, the Alexa AI CLI install fails at the AssumeRole step for `arn:aws:iam::372468808636:role/AddOn3PDeveloperToolsRead` (AccessDenied for AWS account 996385806727). Amazon Devices & Services Enterprise Support has since told us the MCP Preview is opening to partners in phases and that we're on the waitlist, with no date.

**What we've built instead:**
1. A self-hosted MCP server on spec 2025-11-25 over Streamable HTTP, live on AWS, with 22 tools. Its code imports and calls the MCP SDK at runtime, and the repo is public.
2. A simulated Alexa+ experience (an LLM agent on Amazon Bedrock calling those same MCP tools), as the rules allow for the Alexa+ track.
3. A classic Alexa skill (ASK CLI) as an on-device voice front end, so our demo can run on a real Echo / Fire TV, calling the same tools.

**Questions:**
1. Does a live self-hosted MCP server that we can't deploy as an add-on (because the Preview is waitlisted), demonstrated through the simulated Alexa+ path, meet the Stage One requirement for the Alexa+ track?
2. Is it fine to also show a classic Alexa skill in the demo as the on-device voice interface, as long as we describe it accurately?
3. If MCP Preview access is available to hackathon entrants through another route, could you point us to it?

Thanks for your help.

Ishani Kathuria
Devpost team: Homebase · Repo: https://github.com/ikathuria/AmazonDevHack
