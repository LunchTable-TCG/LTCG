/**
 * JSON-Render Exports
 *
 * Re-exports all JSON-render related functionality for easy imports.
 */

export { adminCatalog } from "./catalog";
export type { AdminCatalog } from "./catalog";
export { AdminJsonRenderProvider, useAdminJsonRender, useRenderJson } from "./provider";
export {
  useAIDashboard,
  DASHBOARD_PRESETS,
  type DashboardPreset,
  type DashboardSchema,
  type GeneratedDashboard,
} from "./useAIDashboard";
