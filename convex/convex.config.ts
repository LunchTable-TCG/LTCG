import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/ratelimiter/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import shardedCounter from "@convex-dev/sharded-counter/convex.config";

const app = defineApp();
app.use(rateLimiter);
app.use(aggregate);
app.use(shardedCounter);

export default app;
