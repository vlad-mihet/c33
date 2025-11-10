import { extname } from 'path';

import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';

import {
  ValidationError,
  UnsupportedMediaTypeError,
} from '../common/errors/domain-errors';
import { ErrorCodes } from '../common/errors/error-codes';

import { ImportsService } from './imports.service';

@ApiTags('Imports')
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('xlsx')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Import financial data from XLSX file by type and filename',
    description:
      'Enqueues an import job for an XLSX file located in the configured data directory. Supports: ap, ar, gl, expenseClaims, budgetForecast',
  })
  @ApiBody({
    description: 'Import type and filename',
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['ap', 'ar', 'gl', 'expenseClaims', 'budgetForecast'],
          example: 'ap',
          description:
            'Type of import: ap (Accounts Payable), ar (Accounts Receivable), gl (General Ledger), expenseClaims, budgetForecast',
        },
        filename: {
          type: 'string',
          example: 'Accounts-Payable.xlsx',
          description: 'Name of the XLSX file to import',
        },
      },
      required: ['type', 'filename'],
    },
  })
  @ApiResponse({
    status: 202,
    description:
      'Import job enqueued successfully. Use the returned jobId to check status at GET /queue/:id',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid type or filename',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @ApiResponse({
    status: 415,
    description: 'Unsupported file type (must be .xlsx or .xls)',
  })
  async importByFilename(
    @Body('type') type: 'ap' | 'ar' | 'gl' | 'expenseClaims' | 'budgetForecast',
    @Body('filename') filename: string,
  ): Promise<{ message: string; jobId: string; status: string; type: string }> {
    if (!filename) {
      throw new ValidationError(
        ErrorCodes.IMPORT_MISSING_FILENAME,
        'Filename is required',
      );
    }

    const job = await this.importsService.importXlsxByType(type, filename);

    return {
      message: 'Import job enqueued successfully',
      jobId: job._id.toString(),
      status: job.status,
      type,
    };
  }

  @Post('xlsx/upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './data',
        filename: (req, file, callback) => {
          const uniqueSuffix = `${String(Date.now())}-${String(Math.round(Math.random() * 1e9))}`;
          const ext = extname(file.originalname);
          callback(null, `upload-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (
          !file.originalname.match(/\.(xlsx|xls)$/) &&
          file.mimetype !==
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ) {
          callback(
            new UnsupportedMediaTypeError(
              ErrorCodes.IMPORT_UNSUPPORTED_MEDIA_TYPE,
              'Only XLSX files are allowed',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload and import customers from XLSX file',
    description:
      'Uploads an XLSX file and enqueues an import job to process it',
  })
  @ApiBody({
    description: 'XLSX file upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'XLSX file to upload',
        },
      },
    },
  })
  @ApiResponse({
    status: 202,
    description:
      'File uploaded and import job enqueued successfully. Use the returned jobId to check status at GET /queue/:id',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or file too large',
  })
  async uploadAndImport(@UploadedFile() file?: Express.Multer.File): Promise<{
    message: string;
    filename: string;
    originalFilename: string;
    jobId: string;
    status: string;
  }> {
    if (!file) {
      throw new ValidationError(
        ErrorCodes.IMPORT_MISSING_FILE,
        'File is required',
      );
    }

    const job = await this.importsService.importXlsxByPath(
      file.path,
      file.originalname,
    );

    return {
      message: 'File uploaded and import job enqueued successfully',
      filename: file.filename,
      originalFilename: file.originalname,
      jobId: job._id.toString(),
      status: job.status,
    };
  }
}
