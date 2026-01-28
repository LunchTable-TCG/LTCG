/**
 * Deterministic Random Number Generator
 *
 * Provides seeded randomness for Convex mutations to ensure deterministic behavior.
 * This is critical because Convex mutations can be retried, and non-deterministic
 * operations (like Math.random()) would produce different results on retry.
 */

import { ErrorCode, createError } from "./errorCodes";

/**
 * Simple hash function to convert a string seed into a number
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Mulberry32 PRNG (Pseudo-Random Number Generator)
 * Fast, high-quality seeded random number generator
 *
 * @param seed - A seed value (will be hashed if string)
 * @returns A function that returns deterministic random numbers between 0 and 1
 */
export function createSeededRandom(seed: string | number): () => number {
  let state = typeof seed === "string" ? hashString(seed) : seed;

  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic integer random number generator
 *
 * @param seed - Seed string for deterministic randomness
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns A random integer between min and max
 */
export function randomInt(seed: string, min: number, max: number): number {
  const random = createSeededRandom(seed);
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Deterministic boolean random (coin flip)
 *
 * @param seed - Seed string for deterministic randomness
 * @returns true or false
 */
export function randomBool(seed: string): boolean {
  const random = createSeededRandom(seed);
  return random() < 0.5;
}

/**
 * Deterministic array shuffle using Fisher-Yates algorithm
 *
 * @param array - Array to shuffle
 * @param seed - Seed string for deterministic randomness
 * @returns A new shuffled array (does not mutate original)
 */
export function shuffleArray<T>(array: T[], seed: string): T[] {
  const random = createSeededRandom(seed);
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  return shuffled;
}

/**
 * Pick a random element from an array
 *
 * @param array - Array to pick from
 * @param seed - Seed string for deterministic randomness
 * @returns A random element from the array
 */
export function pickRandom<T>(array: T[], seed: string): T {
  if (array.length === 0) {
    throw createError(ErrorCode.LIBRARY_EMPTY_ARRAY);
  }
  const random = createSeededRandom(seed);
  const index = Math.floor(random() * array.length);
  return array[index]!;
}
