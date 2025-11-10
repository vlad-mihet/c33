export function assertIs<T>(
  value: unknown,
  predicate: (v: unknown) => v is T,
  message = 'Invalid type',
): asserts value is T {
  if (!predicate(value)) {
    throw new TypeError(message);
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function hasProperty<K extends PropertyKey>(
  obj: unknown,
  key: K,
): obj is Record<K, unknown> {
  return isRecord(obj) && key in obj;
}
