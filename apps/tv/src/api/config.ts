// Live Homebase server (CDK output HomebaseStack.ServerUrl) and the demo household.
// No auth yet: account linking is PLAN.md M5, so every client acts on "patels".
export const SERVER_URL = 'https://koothznswwvs4koyux64x4bs3e0msbsb.lambda-url.us-east-1.on.aws';
export const HOUSEHOLD_ID = 'patels';

export const stateUrl = () => `${SERVER_URL}/households/${encodeURIComponent(HOUSEHOLD_ID)}/state`;
export const eventsUrl = (after: number) =>
  `${SERVER_URL}/households/${encodeURIComponent(HOUSEHOLD_ID)}/events?after=${after}`;
export const toolUrl = (name: string) => `${SERVER_URL}/api/tools/${encodeURIComponent(name)}`;
