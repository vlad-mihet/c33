/**
 * Escape special regex characters to prevent ReDoS and injection
 * Based on lodash.escapeRegExp implementation
 */
export function escapeRegex(str: string): string {
  // Escape special regex characters: \ ^ $ * + ? . ( ) | { } [ ]
  return str.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
}
