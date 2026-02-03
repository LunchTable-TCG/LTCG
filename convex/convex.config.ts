import agent from "@convex-dev/agent/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import rag from "@convex-dev/rag/convex.config";
import rateLimiter from "@convex-dev/ratelimiter/convex.config";
import shardedCounter from "@convex-dev/sharded-counter/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(rateLimiter);
app.use(aggregate);
app.use(shardedCounter);
app.use(agent);
app.use(rag);

export default app;
