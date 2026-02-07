/**
 * Generate a stable dedupe key for a LiveKit webhook event
 * This ensures idempotent event processing even if webhooks are retried
 */
export async function createDedupeKey(params: {
  eventType: string;
  roomName?: string;
  participantIdentity?: string;
  trackSid?: string;
  createdAt?: number;
  payload: any;
}): Promise<string> {
  // Prefer event.id if available (LiveKit may provide this)
  if (params.payload?.id) {
    return `lk_event_${params.payload.id}`;
  }

  // Otherwise, create a stable hash from event details using Web Crypto API
  const parts = [
    params.eventType,
    params.roomName || "",
    params.participantIdentity || "",
    params.trackSid || "",
    params.createdAt?.toString() || "",
    JSON.stringify(params.payload),
  ];

  const encoder = new TextEncoder();
  const data = encoder.encode(parts.join("|"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return `lk_${hashHex.slice(0, 32)}`;
}
