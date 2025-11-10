/**
 * Generate ETag for optimistic concurrency control
 * Format: W/"<id>:<version>"
 */
export function generateETag(id: string, version: number): string {
  return `W/"${id}:${String(version)}"`;
}

/**
 * Parse ETag header
 * Returns { id, version } or null if invalid
 */
export function parseETag(
  etag: string,
): { id: string; version: number } | null {
  const match = etag.match(/^W\/"([^:]+):(\d+)"$/);
  if (!match) return null;

  const [, id, versionStr] = match;
  const version = parseInt(versionStr ?? '0', 10);

  if (!id || isNaN(version)) return null;

  return { id, version };
}
