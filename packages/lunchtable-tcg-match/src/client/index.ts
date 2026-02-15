import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { api } from "../component/_generated/api.js";

export type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};

export type RunMutationCtx = {
  runMutation: GenericMutationCtx<GenericDataModel>["runMutation"];
};

export type { api };

/**
 * Client for the @lunchtable-tcg/match Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGMatch } from "@lunchtable-tcg/match";
 *
 * const match = new LTCGMatch(components.ltcgMatch);
 * ```
 */
export class LTCGMatch {
  constructor(private component: typeof api) {}

  // Methods will be added in Task 15
}
