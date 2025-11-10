/**
 * Normalize an email address to canonical form for deduplication
 * Applies: trim whitespace + lowercase
 *
 * @param email - Raw email address
 * @returns Canonical email (trimmed, lowercase)
 */
export function canonicalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Validate that email is a non-empty string
 * @param email - Value to check
 * @returns True if email is a non-empty string
 */
export function isValidEmailString(email: unknown): email is string {
  return typeof email === 'string' && email.trim().length > 0;
}
