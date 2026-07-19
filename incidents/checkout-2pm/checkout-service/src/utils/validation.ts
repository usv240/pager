import { ValidationError } from "../domain/errors.js";

export function readRequiredString(value: unknown, field: string, maximumLength = 200): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string.`);
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError(`${field} is required.`);
  }
  if (normalized.length > maximumLength) {
    throw new ValidationError(`${field} must contain no more than ${maximumLength} characters.`);
  }
  return normalized;
}

export function readOptionalString(
  value: unknown,
  field: string,
  maximumLength = 200,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  return readRequiredString(value, field, maximumLength);
}

export function readInteger(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new ValidationError(`${field} must be an integer.`);
  }
  if (value < minimum || value > maximum) {
    throw new ValidationError(`${field} must be from ${minimum} through ${maximum}.`);
  }
  return value;
}

export function readBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError(`${field} must be a boolean.`);
  }
  return value;
}

export function readRecord(value: unknown, field = "body"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(`${field} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

export function readStringArray(
  value: unknown,
  field: string,
  maximumItems = 100,
): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${field} must be an array.`);
  }
  if (value.length > maximumItems) {
    throw new ValidationError(`${field} must contain no more than ${maximumItems} items.`);
  }
  return value.map((item, index) => readRequiredString(item, `${field}[${index}]`));
}

export function assertOnlyKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  field = "body",
): void {
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(record).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) {
    throw new ValidationError(`${field} contains unsupported fields: ${unexpected.join(", ")}.`);
  }
}

export function readEnum<T extends string>(
  value: unknown,
  field: string,
  values: readonly T[],
): T {
  const normalized = readRequiredString(value, field);
  if (!values.includes(normalized as T)) {
    throw new ValidationError(`${field} must be one of: ${values.join(", ")}.`);
  }
  return normalized as T;
}

export function readIsoDate(value: unknown, field: string): Date {
  const text = readRequiredString(value, field);
  const date = new Date(text);
  if (!Number.isFinite(date.getTime())) {
    throw new ValidationError(`${field} must be an ISO-8601 date.`);
  }
  return date;
}
