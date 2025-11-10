import * as fs from 'fs';
import * as path from 'path';

import { Injectable, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';

import { ImportError } from '../common/errors/domain-errors';
import { ErrorCodes } from '../common/errors/error-codes';

import type { ImportManifest } from './types/import.types';
import type { XlsxRow } from './utils/xlsx.util';

/**
 * Service for handling XLSX file operations and manifest management
 *
 * This service provides:
 * - Manifest loading and caching
 * - XLSX file parsing
 * - Customer row normalization (legacy)
 *
 * Pure utility functions (date parsing, row mapping) remain in xlsx.util.ts
 */
@Injectable()
export class XlsxService {
  private readonly logger = new Logger(XlsxService.name);
  private cachedManifest: ImportManifest | null = null;

  /**
   * Load and cache the import manifest
   * @returns The import manifest configuration
   * @throws Error if manifest file not found
   */
  loadManifest(): ImportManifest {
    if (this.cachedManifest) {
      return this.cachedManifest;
    }

    const manifestPath = path.join(
      process.cwd(),
      'config',
      'import-manifest.json',
    );

    if (!fs.existsSync(manifestPath)) {
      throw new ImportError(
        ErrorCodes.IMPORT_MANIFEST_NOT_FOUND,
        500,
        `Import manifest not found at ${manifestPath}`,
      );
    }

    const manifestData = fs.readFileSync(manifestPath, 'utf-8');
    this.cachedManifest = JSON.parse(manifestData) as ImportManifest;

    this.logger.log('Import manifest loaded successfully');
    return this.cachedManifest;
  }

  /**
   * Parse XLSX file and return rows from the specified sheet or first sheet.
   * @param filePath - Path to the XLSX file
   * @param sheetName - Optional sheet name (defaults to 'Customers' or first sheet)
   * @returns Array of row objects
   * @throws Error if file cannot be parsed or sheet not found
   */
  parseXlsxFile(filePath: string, sheetName?: string): XlsxRow[] {
    try {
      // Read the workbook
      const workbook = xlsx.readFile(filePath);

      // Get target sheet name
      let targetSheet: string;
      if (sheetName && workbook.SheetNames.includes(sheetName)) {
        targetSheet = sheetName;
      } else if (workbook.SheetNames.includes('Customers')) {
        targetSheet = 'Customers';
      } else {
        const firstSheet = workbook.SheetNames[0];
        if (!firstSheet) {
          throw new ImportError(
            ErrorCodes.IMPORT_NO_SHEETS,
            400,
            'No sheets found in workbook',
          );
        }
        targetSheet = firstSheet;
      }

      this.logger.log(`Parsing sheet: ${targetSheet}`);

      // Get the worksheet (workbook.Sheets uses index signature, so could be undefined)
      const worksheet =
        workbook.Sheets[targetSheet] ??
        (() => {
          throw new ImportError(
            ErrorCodes.IMPORT_SHEET_NOT_FOUND,
            400,
            `Sheet ${targetSheet} not found`,
          );
        })();

      // Convert to JSON (array of objects)
      const rows = xlsx.utils.sheet_to_json<XlsxRow>(worksheet, {
        defval: '',
        raw: false,
      });

      return rows;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error parsing XLSX file: ${message}`);
      throw new ImportError(
        ErrorCodes.IMPORT_PARSE_FAILED,
        400,
        `Failed to parse XLSX file: ${message}`,
        error instanceof Error ? { cause: error } : undefined,
      );
    }
  }
}
