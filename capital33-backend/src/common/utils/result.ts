/**
 * Generic result type for operations that may succeed or fail.
 * Useful for encapsulating error handling.
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export class ResultUtil {
  static success<T>(data: T): Result<T> {
    return { success: true, data };
  }

  static failure<E = Error>(error: E): Result<never, E> {
    return { success: false, error };
  }
}
