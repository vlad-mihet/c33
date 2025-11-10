/**
 * Payment status enumeration
 * Used across AP, AR, and other invoice-related schemas
 */
export enum PaymentStatus {
  OPEN = 'Open',
  PAID = 'Paid',
  PARTIALLY_PAID = 'PartiallyPaid',
  OVERDUE = 'Overdue',
  CANCELED = 'Canceled',
}

/**
 * Array of all payment status values for Joi validation
 */
export const PAYMENT_STATUS_VALUES = Object.values(PaymentStatus);

/**
 * Type guard to check if a value is a valid PaymentStatus
 */
export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return (
    typeof value === 'string' &&
    PAYMENT_STATUS_VALUES.includes(value as PaymentStatus)
  );
}
