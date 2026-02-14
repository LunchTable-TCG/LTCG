// Third-party components
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

// LTCG domain components
import ltcgAdmin from "@lunchtable-tcg/admin/convex.config";
import ltcgAi from "@lunchtable-tcg/ai/convex.config";
import ltcgBranding from "@lunchtable-tcg/branding/convex.config";
import ltcgCards from "@lunchtable-tcg/cards/convex.config";
import ltcgCompetitive from "@lunchtable-tcg/competitive/convex.config";
import ltcgContent from "@lunchtable-tcg/content/convex.config";
import ltcgEconomy from "@lunchtable-tcg/economy/convex.config";
import ltcgEmail from "@lunchtable-tcg/email/convex.config";
import ltcgGame from "@lunchtable-tcg/game/convex.config";
import ltcgGuilds from "@lunchtable-tcg/guilds/convex.config";
import ltcgMarketplace from "@lunchtable-tcg/marketplace/convex.config";
import ltcgPayments from "@lunchtable-tcg/payments/convex.config";
import ltcgProgression from "@lunchtable-tcg/progression/convex.config";
import ltcgReferrals from "@lunchtable-tcg/referrals/convex.config";
import ltcgSeasons from "@lunchtable-tcg/seasons/convex.config";
import ltcgSocial from "@lunchtable-tcg/social/convex.config";
import ltcgStory from "@lunchtable-tcg/story/convex.config";

import ltcgToken from "@lunchtable-tcg/token/convex.config";
import ltcgTreasury from "@lunchtable-tcg/treasury/convex.config";
import ltcgWebhooks from "@lunchtable-tcg/webhooks/convex.config";

import { defineApp } from "convex/server";

const app = defineApp();

// Third-party components
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

// LTCG domain components
app.use(ltcgAdmin);
app.use(ltcgAi);
app.use(ltcgBranding);
app.use(ltcgCards);
app.use(ltcgCompetitive);
app.use(ltcgContent);
app.use(ltcgEconomy);
app.use(ltcgEmail);
app.use(ltcgGame);
app.use(ltcgGuilds);
app.use(ltcgMarketplace);
app.use(ltcgPayments);
app.use(ltcgProgression);
app.use(ltcgReferrals);
app.use(ltcgSeasons);
app.use(ltcgSocial);
app.use(ltcgStory);

app.use(ltcgToken);
app.use(ltcgTreasury);
app.use(ltcgWebhooks);

export default app;
