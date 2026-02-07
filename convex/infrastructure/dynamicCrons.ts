/**
 * Dynamic Cron Scheduling
 *
 * Uses @convex-dev/crons for runtime cron registration.
 * Used for tournament phase transitions, content publishing, and sale events
 * instead of polling every minute/5 minutes.
 */

import { Crons } from "@convex-dev/crons";
import { components } from "../_generated/api";

export const dynamicCrons = new Crons((components as any).dynamicCrons);
