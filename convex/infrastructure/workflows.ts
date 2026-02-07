/**
 * Workflow Manager
 *
 * Uses @convex-dev/workflow for durable, long-running workflows.
 * Currently installed for future use.
 *
 * Future candidates:
 * - Complex marketplace settlement flows
 * - Multi-step admin batch operations
 * - External API integration chains
 */

import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "../_generated/api";

export const workflow = new WorkflowManager((components as any).workflow);
