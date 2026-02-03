/**
 * Top-level tutorial export for backward compatibility
 * Maintains flat API structure (api.tutorial.*) while code is organized in subdirectories
 */

export {
  getTutorialStatus,
  getHelpModeEnabled,
  updateTutorialProgress,
  completeTutorial,
  dismissTutorial,
  resetTutorial,
  setHelpModeEnabled,
  initializeTutorial,
} from "./core/tutorial";
