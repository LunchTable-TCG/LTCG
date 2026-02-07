import actionCache from "@convex-dev/action-cache/convex.config";
import actionRetrier from "@convex-dev/action-retrier/convex.config";
import agent from "@convex-dev/agent/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import dynamicCrons from "@convex-dev/crons/convex.config";
import migrations from "@convex-dev/migrations/convex.config";
import presence from "@convex-dev/presence/convex.config";
import rag from "@convex-dev/rag/convex.config";
import rateLimiter from "@convex-dev/ratelimiter/convex.config";
import shardedCounter from "@convex-dev/sharded-counter/convex.config";
import stripe from "@convex-dev/stripe/convex.config.js";
import workflow from "@convex-dev/workflow/convex.config";
import workpool from "@convex-dev/workpool/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(actionCache);
app.use(actionRetrier);
app.use(rateLimiter);
app.use(aggregate);
app.use(dynamicCrons);
app.use(migrations);
app.use(shardedCounter);
app.use(agent);
app.use(rag);
app.use(presence);
app.use(workpool);
app.use(workflow);
app.use(stripe);
// Note: static crons are defined in crons.ts, dynamic crons use @convex-dev/crons component

export default app;
