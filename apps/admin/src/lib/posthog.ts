/**
 * PostHog API Integration for Admin Panel
 *
 * Server-side PostHog API calls for session recordings,
 * events, and user behavior analytics.
 */

// PostHog API configuration
const POSTHOG_API_KEY = process.env["POSTHOG_PRIVATE_API_KEY"];
const POSTHOG_PROJECT_ID = process.env["POSTHOG_PROJECT_ID"];
const POSTHOG_HOST = process.env["NEXT_PUBLIC_POSTHOG_HOST"] || "https://us.i.posthog.com";

// =============================================================================
// Types
// =============================================================================

export interface PostHogSession {
  id: string;
  distinct_id: string;
  viewed: boolean;
  recording_duration: number;
  active_seconds: number;
  start_time: string;
  end_time: string;
  click_count: number;
  keypress_count: number;
  console_error_count: number;
  console_warn_count: number;
  person?: {
    id: string;
    name?: string;
    email?: string;
    properties?: Record<string, unknown>;
  };
  start_url?: string;
}

export interface PostHogEvent {
  id: string;
  distinct_id: string;
  event: string;
  timestamp: string;
  properties: Record<string, unknown>;
  person?: {
    id: string;
    properties?: Record<string, unknown>;
  };
}

export interface PostHogInsight {
  id: number;
  name: string;
  description?: string;
  result?: unknown[];
}

export interface SessionFilters {
  limit?: number;
  offset?: number;
  date_from?: string;
  date_to?: string;
  person_uuid?: string;
  has_console_error?: boolean;
  min_duration?: number;
}

export interface EventFilters {
  event?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  properties?: Record<string, unknown>;
}

// =============================================================================
// API Client
// =============================================================================

class PostHogClient {
  private apiKey: string | undefined;
  private projectId: string | undefined;
  private host: string;

  constructor() {
    this.apiKey = POSTHOG_API_KEY;
    this.projectId = POSTHOG_PROJECT_ID;
    this.host = POSTHOG_HOST;
  }

  isConfigured(): boolean {
    return !!this.apiKey && !!this.projectId;
  }

  getConfig() {
    return {
      configured: this.isConfigured(),
      host: this.host,
      hasApiKey: !!this.apiKey,
      hasProjectId: !!this.projectId,
    };
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey || !this.projectId) {
      throw new Error(
        "PostHog API not configured. Set POSTHOG_PRIVATE_API_KEY and POSTHOG_PROJECT_ID."
      );
    }

    const url = `${this.host}/api/projects/${this.projectId}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PostHog API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // =========================================================================
  // Session Recordings
  // =========================================================================

  /**
   * Get list of session recordings
   */
  async getSessions(filters: SessionFilters = {}): Promise<{
    results: PostHogSession[];
    next?: string;
    count: number;
  }> {
    const params = new URLSearchParams();

    if (filters.limit) params.set("limit", filters.limit.toString());
    if (filters.offset) params.set("offset", filters.offset.toString());
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.person_uuid) params.set("person_uuid", filters.person_uuid);

    // Filter for sessions with errors
    if (filters.has_console_error) {
      params.set(
        "console_logs",
        JSON.stringify([{ key: "level", value: ["error"], operator: "exact" }])
      );
    }

    const queryString = params.toString();
    const endpoint = `/session_recordings${queryString ? `?${queryString}` : ""}`;

    return this.fetch(endpoint);
  }

  /**
   * Get a specific session recording
   */
  async getSession(sessionId: string): Promise<PostHogSession> {
    return this.fetch(`/session_recordings/${sessionId}`);
  }

  /**
   * Get session recording URL for embedding
   */
  getSessionReplayUrl(sessionId: string): string {
    if (!this.projectId) return "";
    return `${this.host}/project/${this.projectId}/replay/${sessionId}`;
  }

  // =========================================================================
  // Events
  // =========================================================================

  /**
   * Get events with optional filters
   */
  async getEvents(filters: EventFilters = {}): Promise<{
    results: PostHogEvent[];
    next?: string;
  }> {
    const params = new URLSearchParams();

    if (filters.event) params.set("event", filters.event);
    if (filters.date_from) params.set("after", filters.date_from);
    if (filters.date_to) params.set("before", filters.date_to);
    if (filters.limit) params.set("limit", filters.limit.toString());

    const queryString = params.toString();
    return this.fetch(`/events${queryString ? `?${queryString}` : ""}`);
  }

  /**
   * Get error events grouped by page
   */
  async getErrorsByPage(dateFrom?: string): Promise<Map<string, number>> {
    const events = await this.getEvents({
      event: "error_occurred",
      date_from: dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      limit: 1000,
    });

    const errorsByPage = new Map<string, number>();

    for (const event of events.results) {
      const page = (event.properties["$current_url"] as string) || "unknown";
      const pathname = new URL(page, "http://localhost").pathname;
      errorsByPage.set(pathname, (errorsByPage.get(pathname) || 0) + 1);
    }

    return errorsByPage;
  }

  // =========================================================================
  // Insights / Analytics
  // =========================================================================

  /**
   * Query PostHog insights API for custom analytics
   */
  async queryInsight(query: {
    events: Array<{ id: string; name?: string; math?: string }>;
    date_from?: string;
    date_to?: string;
    breakdown?: string;
    breakdown_type?: string;
  }): Promise<unknown> {
    return this.fetch("/query/", {
      method: "POST",
      body: JSON.stringify({
        kind: "EventsQuery",
        ...query,
      }),
    });
  }

  /**
   * Get pageview funnel data
   */
  async getFunnelData(steps: string[]): Promise<unknown> {
    return this.fetch("/query/", {
      method: "POST",
      body: JSON.stringify({
        kind: "FunnelQuery",
        series: steps.map((step) => ({
          event: step,
          kind: "EventsNode",
        })),
        funnelWindowInterval: 14,
        funnelWindowIntervalUnit: "day",
      }),
    });
  }

  // =========================================================================
  // Persons
  // =========================================================================

  /**
   * Get persons (users) list
   */
  async getPersons(limit = 100): Promise<{
    results: Array<{
      id: string;
      distinct_ids: string[];
      properties: Record<string, unknown>;
      created_at: string;
    }>;
    next?: string;
  }> {
    return this.fetch(`/persons?limit=${limit}`);
  }

  /**
   * Search for a person by distinct ID
   */
  async searchPerson(distinctId: string): Promise<{
    results: Array<{
      id: string;
      distinct_ids: string[];
      properties: Record<string, unknown>;
    }>;
  }> {
    return this.fetch(`/persons?distinct_id=${encodeURIComponent(distinctId)}`);
  }
}

// Export singleton instance
export const posthogApi = new PostHogClient();
