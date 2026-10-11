import * as cdk from "aws-cdk-lib";
import { HomebaseStack } from "../lib/homebase-stack.js";

const app = new cdk.App();
// Alexa+ is US-only; keep everything in us-east-1.
new HomebaseStack(app, "HomebaseStack", { env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-1" } });
