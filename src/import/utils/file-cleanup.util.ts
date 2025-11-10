import { promises as fs } from 'fs';

import type { Logger } from '@nestjs/common';

/**
 * Cleans up temporary uploaded files after import processing
 *
 * @param filePath - Path to the file to clean up
 * @param logger - Logger instance for logging cleanup operations
 * @returns Promise<void>
 *
 * @remarks
 * Only deletes files with 'upload-' in the path to avoid accidentally
 * deleting permanent data files. Logs warnings if cleanup fails.
 */
export async function cleanupImportFile(
  filePath: string,
  logger: Logger,
): Promise<void> {
  // Only clean up temporary uploaded files
  if (!filePath.includes('upload-')) {
    return;
  }

  try {
    await fs.unlink(filePath);
    logger.log(`Cleaned up uploaded file: ${filePath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to clean up file ${filePath}: ${message}`);
  }
}
