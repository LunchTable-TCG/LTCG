/**
 * Logging sanitization utilities to prevent sensitive data from appearing in logs
 */

const SENSITIVE_KEYS = [
  'streamKey',
  'customRtmpUrl',
  'token',
  'rtmpUrl',
  'overlayToken',
  'accessCode',
  'streamKeyHash',
  'authorization',
  'password',
  'secret',
  'apiKey',
  'apiSecret',
  'webhookSecret',
];

/**
 * Recursively sanitize an object to redact sensitive keys
 */
export function sanitizeForLogging(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLogging(item));
  }

  // Handle objects
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      if (SENSITIVE_KEYS.includes(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = sanitizeForLogging(sanitized[key]);
      }
    }
  }

  return sanitized;
}

/**
 * Log error with automatic sanitization
 */
export function logError(message: string, context?: any): void {
  if (context) {
    console.error(message, sanitizeForLogging(context));
  } else {
    console.error(message);
  }
}

/**
 * Log warning with automatic sanitization
 */
export function logWarn(message: string, context?: any): void {
  if (context) {
    console.warn(message, sanitizeForLogging(context));
  } else {
    console.warn(message);
  }
}

/**
 * Log info with automatic sanitization
 */
export function logInfo(message: string, context?: any): void {
  if (context) {
    console.log(message, sanitizeForLogging(context));
  } else {
    console.log(message);
  }
}
