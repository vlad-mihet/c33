/**
 * Pagination utility functions
 */

export interface ClampedPaginationParams {
  page: number;
  pageSize: number;
  skip: number;
}

/**
 * Maximum page size to prevent DoS attacks
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Default page size
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Clamp and normalize pagination parameters
 *
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page
 * @param maxPageSize - Maximum allowed page size (default: 100)
 * @returns Normalized pagination params with skip offset
 */
export function clampPagination(
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  maxPageSize: number = MAX_PAGE_SIZE,
): ClampedPaginationParams {
  const normalizedPage = Math.max(1, page);
  const normalizedPageSize = Math.min(Math.max(1, pageSize), maxPageSize);
  const skip = (normalizedPage - 1) * normalizedPageSize;

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    skip,
  };
}

/**
 * Calculate total pages from total count and page size
 *
 * @param total - Total number of items
 * @param pageSize - Items per page
 * @returns Total number of pages
 */
export function calculateTotalPages(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}
