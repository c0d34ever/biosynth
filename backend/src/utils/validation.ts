/**
 * Utility functions for request validation
 */

/**
 * Parse and validate integer from request parameter
 */
export function parseId(param: string | undefined, fieldName: string = 'id'): number {
  if (!param) {
    throw new Error(`${fieldName} is required`);
  }
  const id = parseInt(param, 10);
  if (isNaN(id)) {
    throw new Error(`Invalid ${fieldName}: must be a number`);
  }
  return id;
}

/**
 * Parse optional integer from request parameter
 */
export function parseOptionalId(param: string | undefined): number | null {
  if (!param) {
    return null;
  }
  const id = parseInt(param, 10);
  return isNaN(id) ? null : id;
}

