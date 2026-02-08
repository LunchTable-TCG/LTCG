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

type WorkflowComponent = ConstructorParameters<typeof WorkflowManager>[0];
const workflowComponent = (components as { workflow: WorkflowComponent }).workflow;

export const workflow = new WorkflowManager(workflowComponent);
