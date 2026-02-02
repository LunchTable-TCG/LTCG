/**
 * LTCG API Client
 *
 * Export all client components for external use
 */

export { LTCGApiClient } from "./LTCGApiClient";
export type { LTCGApiClientConfig } from "./LTCGApiClient";

export {
  LTCGApiError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  NetworkError,
  GameError,
  parseErrorResponse,
} from "./errors";

export { ConvexRealtimeClient } from "./realtimeClient";
export type { ConvexRealtimeClientConfig } from "./realtimeClient";

export type {
  GameStateUpdatedEvent,
  TurnNotificationEvent,
  GameEventOccurredEvent,
  GameEndedEvent,
  ChainWindowOpenEvent,
  GameRealtimeEvent,
  GameStateCallback,
  TurnNotificationCallback,
  GameEventCallback,
  ChainWindowCallback,
  EventCallback,
  GameEventEmitter,
  Subscription,
  SubscriptionOptions,
} from "./events";
