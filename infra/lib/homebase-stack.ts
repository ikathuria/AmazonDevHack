// Homebase backend: DynamoDB single table, server Lambda (MCP + SSE) behind a streaming Function URL,
// and an SQS queue + worker Lambda for slow Bedrock work (never in the MCP request path).
// Cognito (account linking, M5) and S3/CloudFront (web app, M4) are added when those milestones start.
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import type { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const serverSrc = path.join(repoRoot, "apps/server/src");

export class HomebaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "Table", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      // Hackathon/dev stack: deleting the stack deletes the data. Prod stage (M7) switches to RETAIN.
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const dlq = new sqs.Queue(this, "PlanDlq", { retentionPeriod: cdk.Duration.days(14) });
    const planQueue = new sqs.Queue(this, "PlanQueue", {
      visibilityTimeout: cdk.Duration.seconds(120),
      deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
    });

    const bedrockModelId = this.node.tryGetContext("bedrockModelId") ?? "us.anthropic.claude-haiku-4-5-20251001-v1:0";
    const common = {
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      bundling: { format: cdk.aws_lambda_nodejs.OutputFormat.ESM, target: "node24", banner: "import { createRequire } from 'module';const require = createRequire(import.meta.url);" },
      environment: { TABLE_NAME: table.tableName, PLAN_QUEUE_URL: planQueue.queueUrl, DEMO_HOUSEHOLD_ID: "patels", PROTECTED_HOUSEHOLDS: "patels", BEDROCK_MODEL_ID: bedrockModelId },
      // esbuild resolves deps from each source file, so apps/server and packages/contracts use their own node_modules.
      projectRoot: repoRoot,
      depsLockFilePath: path.join(repoRoot, "apps/server/package-lock.json"),
    };
    const logGroup = (name: string) => new logs.LogGroup(this, `${name}Logs`, { retention: logs.RetentionDays.TWO_WEEKS, removalPolicy: cdk.RemovalPolicy.DESTROY });

    const server = new NodejsFunction(this, "Server", {
      ...common,
      entry: path.join(serverSrc, "lambda.ts"),
      logGroup: logGroup("Server"),
      handler: "handler",
      memorySize: 1024, // more memory = more CPU = lower MCP latency (<500 ms budget)
      timeout: cdk.Duration.minutes(15), // SSE responses stay open up to 10 min, then the client reconnects
    });
    table.grantReadWriteData(server);
    planQueue.grantSendMessages(server);
    // Only the simulated Alexa+ endpoint (/api/sim/converse) uses Bedrock on the server; MCP tools never do.
    const bedrockInvoke = new iam.PolicyStatement({
      actions: ["bedrock:InvokeModel", "bedrock:Converse"],
      resources: ["arn:aws:bedrock:*::foundation-model/anthropic.*", `arn:aws:bedrock:*:${this.account}:inference-profile/*`],
    });
    server.addToRolePolicy(bedrockInvoke);

    const url = server.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
      cors: { allowedOrigins: ["*"], allowedMethods: [lambda.HttpMethod.ALL], allowedHeaders: ["*"] },
    });

    // Keep one server instance warm so Alexa+ never waits on a cold start (first call was ~1.1 s vs the 500 ms budget).
    new events.Rule(this, "WarmServer", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      // Shaped like a Function URL request so the normal HTTP handler answers it.
      targets: [new targets.LambdaFunction(server, { event: events.RuleTargetInput.fromObject({
        version: "2.0", routeKey: "$default", rawPath: "/health", rawQueryString: "", headers: { host: "warmup" }, isBase64Encoded: false,
        requestContext: { http: { method: "GET", path: "/health", protocol: "HTTP/1.1", sourceIp: "127.0.0.1", userAgent: "warmup" }, domainName: "warmup" },
      }) })],
    });

    const worker = new NodejsFunction(this, "Worker", {
      ...common,
      entry: path.join(serverSrc, "worker.ts"),
      logGroup: logGroup("Worker"),
      handler: "handler",
      memorySize: 512,
      timeout: cdk.Duration.seconds(90),
    });
    table.grantReadWriteData(worker);
    worker.addEventSource(new SqsEventSource(planQueue, { batchSize: 1 }));
    worker.addToRolePolicy(bedrockInvoke);

    new cdk.CfnOutput(this, "ServerUrl", { value: url.url });
    new cdk.CfnOutput(this, "TableName", { value: table.tableName });
    new cdk.CfnOutput(this, "PlanQueueUrl", { value: planQueue.queueUrl });
  }
}
