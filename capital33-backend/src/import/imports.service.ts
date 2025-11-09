import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { QueueService } from '../queue/queue.service';
import { JobType } from '../queue/queue.constants';
import { JobDocument } from '../queue/schemas/job.schema';
import { loadManifest } from './utils/xlsx.util';

type ImportType = 'ap' | 'ar' | 'gl' | 'expenseClaims' | 'budgetForecast';

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);
  private readonly dataDir: string;

  private readonly typeToJobType: Record<ImportType, string> = {
    ap: JobType.IMPORT_XLSX_AP,
    ar: JobType.IMPORT_XLSX_AR,
    gl: JobType.IMPORT_XLSX_GL,
    expenseClaims: JobType.IMPORT_XLSX_EXPENSE_CLAIMS,
    budgetForecast: JobType.IMPORT_XLSX_BUDGET_FORECAST,
  };

  constructor(
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {
    this.dataDir = this.configService.get<string>('import.dataDir', './data');
  }

  /**
   * Enqueue an XLSX import job by type and filename
   */
  async importXlsxByType(
    type: ImportType,
    filename: string,
  ): Promise<JobDocument> {
    // Validate type
    if (!this.typeToJobType[type]) {
      throw new BadRequestException(
        `Unknown import type: ${type}. Valid types: ap, ar, gl, expenseClaims, budgetForecast`,
      );
    }

    // Prevent directory traversal attacks
    const basename = path.basename(filename);
    if (basename !== filename || filename.includes('..')) {
      throw new BadRequestException('Invalid filename');
    }

    const filePath = path.join(this.dataDir, basename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`File not found: ${filename}`);
    }

    // Validate file extension
    const ext = path.extname(filename).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      throw new UnsupportedMediaTypeException(
        'Only .xlsx and .xls files are supported',
      );
    }

    this.logger.log(`Enqueueing ${type} import for file: ${filePath}`);

    const jobType = this.typeToJobType[type];

    return this.queueService.enqueue({
      type: jobType,
      payload: { filePath },
      maxAttempts: 3,
    });
  }

  /**
   * Infer import type from filename and enqueue job
   */
  async importXlsxByFilename(filename: string): Promise<JobDocument> {
    const manifest = loadManifest();

    // Try to match filename to a type in the manifest
    let matchedType: ImportType | null = null;
    for (const [type, config] of Object.entries(manifest.importTypes)) {
      if (config.filename === filename) {
        matchedType = type as ImportType;
        break;
      }
    }

    if (!matchedType) {
      throw new BadRequestException(
        `Unable to determine import type for filename: ${filename}`,
      );
    }

    return this.importXlsxByType(matchedType, filename);
  }

  /**
   * Enqueue an XLSX import job for an uploaded file
   * Infers type from original filename
   */
  async importXlsxByPath(
    filePath: string,
    originalFilename?: string,
  ): Promise<JobDocument> {
    const manifest = loadManifest();

    // Try to match original filename to a type
    let matchedType: ImportType | null = null;
    if (originalFilename) {
      for (const [type, config] of Object.entries(manifest.importTypes)) {
        if (config.filename === originalFilename) {
          matchedType = type as ImportType;
          break;
        }
      }
    }

    // If no match, throw error
    if (!matchedType) {
      throw new BadRequestException(
        `Unable to determine import type. Filename must match one of: ${Object.values(
          manifest.importTypes,
        )
          .map((c) => c.filename)
          .join(', ')}`,
      );
    }

    this.logger.log(
      `Enqueueing ${matchedType} import for uploaded file: ${filePath}`,
    );

    const jobType = this.typeToJobType[matchedType];

    return this.queueService.enqueue({
      type: jobType,
      payload: { filePath },
      maxAttempts: 3,
    });
  }

  /**
   * Legacy method for customer imports
   */
  async importXlsxCustomers(filename: string): Promise<JobDocument> {
    const basename = path.basename(filename);
    if (basename !== filename || filename.includes('..')) {
      throw new BadRequestException('Invalid filename');
    }

    const filePath = path.join(this.dataDir, basename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`File not found: ${filename}`);
    }

    this.logger.log(`Enqueueing customer import for file: ${filePath}`);

    return this.queueService.enqueue({
      type: JobType.IMPORT_XLSX_CUSTOMERS,
      payload: { filePath },
      maxAttempts: 3,
    });
  }
}
