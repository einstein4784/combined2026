/**
 * Regex utility functions to prevent ReDoS attacks
 */

/**
 * Escape special regex characters in a string to make it safe for use in regex patterns
 * @param str The string to escape
 * @returns Escaped string safe for regex use
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a case-insensitive regex pattern from a search string
 * Escapes special characters and wraps in regex pattern
 * @param searchString The string to search for
 * @returns Object with regex pattern and options
 */
export function createSafeRegex(searchString: string, options: { caseInsensitive?: boolean; anchored?: boolean } = {}) {
  const escaped = escapeRegex(searchString.trim());
  const pattern = options.anchored ? `^${escaped}` : escaped;
  const regexOptions = options.caseInsensitive ? 'i' : '';
  
  return {
    $regex: pattern,
    $options: regexOptions,
  };
}




