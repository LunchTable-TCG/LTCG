/**
 * Convex Test Helpers Index
 *
 * Centralized exports for Convex backend test utilities
 */

// Authentication helpers
export {
  createAuthenticatedUser,
  createAuthenticatedUsers,
  getTestIdentity,
  createUserWithGold,
  createUserWithRating,
  type CreateAuthenticatedUserOptions,
  type AuthenticatedUser,
} from "./testAuth";

// Re-export from shared helpers
export {
  createPrivyIdentity,
  createDeterministicPrivyIdentity,
  createMockPrivyToken,
  verifyMockPrivyToken,
  type MockPrivyTokenOptions,
} from "../../../tests/helpers/mockPrivyJwt";
