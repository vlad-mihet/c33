import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * Swagger decorator for paginated list responses
 * Applies standardized response schema with envelope + meta
 *
 * @param dataType - The DTO class for items in the data array
 * @param description - Response description
 *
 */
export function ApiPaginatedResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataType: new (...args: any[]) => any,
  description: string = 'Paginated list',
): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(dataType),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          {
            properties: {
              status: { type: 'string', example: 'success' },
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(dataType) },
              },
              meta: {
                type: 'object',
                properties: {
                  page: { type: 'number', example: 1 },
                  pageSize: { type: 'number', example: 20 },
                  total: { type: 'number', example: 42 },
                  totalPages: { type: 'number', example: 3 },
                },
              },
              correlationId: { type: 'string', format: 'uuid' },
            },
          },
        ],
      },
    }),
  );
}
