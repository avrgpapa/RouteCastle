// parseRouteSheet.js

/**
 * Parses a single CSV line with support for quoted fields and escaped quotes.
 * @param {string} line - The CSV line to parse
 * @returns {string[]} Array of parsed fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    // Handle double quotes in CSV (escaped as "")
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i++; // Skip next quote
      continue;
    }

    // Toggle quoted state
    if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
      insideQuotes = !insideQuotes;
      continue;
    }

    // Handle delimiters outside quotes
    if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  // Push the last field
  result.push(current.trim());
  return result;
}

/**
 * Normalizes an address string to consistent format
 * @param {string} address - Raw address string
 * @returns {string} Normalized address
 */
function normalizeAddress(address) {
  return address
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Maps various input status strings to a standard set.
 */
const STATUS_MAP = {
  active: 'active',
  suspended: 'suspended',
  canceled: 'canceled',
  cancelled: 'canceled', // UK spelling
  cancel: 'canceled',
  canc: 'canceled',
};

/**
 * Validates and standardizes status values
 * @param {string} status - Raw status string
 * @returns {string} Validated status or 'unknown'
 */
function validateStatus(status) {
  if (!status) return 'unknown';
  const normalized = status.toLowerCase();
  return STATUS_MAP[normalized] || 'unknown';
}

/**
 * Cleans and normalizes input lines
 * Replaces non-breaking spaces, normalizes unicode, trims whitespace.
 * @param {string} line
 * @returns {string}
 */
function cleanLine(line) {
  return line
    .replace(/\u00A0/g, ' ') // Non-breaking spaces to space
    .normalize('NFKC') // Unicode normalization
    .trim();
}

/**
 * Parses route sheet text from OCR or CSV input.
 * Supports tabs, multi-space, commas, quoted CSV fields, comments, flexible status,
 * and optional debug logging.
 * Returns array of {address, status, notes}.
 * 
 * @param {string} rawText - The input text to parse
 * @param {object} [options] - Parsing options
 * @param {boolean} [options.strictStatus=false] - Whether to require valid statuses
 * @param {boolean} [options.debug=false] - Enable debug logging
 * @returns {Array<{address: string, status: string, notes: string}>} Parsed stops
 */
export function parseRouteSheet(rawText, options = {}) {
  const { strictStatus = false, debug = false } = options;

  if (!rawText || typeof rawText !== 'string') {
    if (debug) console.warn(`Invalid parseRouteSheet input: ${typeof rawText}`, rawText);
    return [];
  }

  const lines = rawText
    .split('\n')
    .map(cleanLine)
    .filter(line => line && !line.startsWith('#') && !line.startsWith('//'));

  const stops = [];

  for (const [index, line] of lines.entries()) {
    let parts = [];

    // Determine delimiter and parse accordingly
    if (line.includes('\t')) {
      parts = line.split('\t').map(p => p.trim());
      if (debug) console.log(`Line ${index + 1} split by tab:`, parts);
    } else if (line.includes(',')) {
      parts = parseCSVLine(line);
      if (debug) console.log(`Line ${index + 1} split by CSV:`, parts);
    } else {
      // Fallback: split by 2+ spaces replaced with pipe (|), then split by pipe
      const normalized = line.replace(/\s{2,}/g, '|');
      parts = normalized.split('|').map(p => p.trim());
      if (debug) console.log(`Line ${index + 1} split by spaces:`, parts);
    }

    // Extract components with defaults
    const [rawAddress, rawStatus = '', rawNotes = ''] = parts;

    if (!rawAddress) {
      if (debug) console.warn(`Line ${index + 1} skipped: Missing address.`);
      continue;
    }

    // Process fields
    const address = normalizeAddress(rawAddress);
    const status = strictStatus ? validateStatus(rawStatus) : (rawStatus || '').toLowerCase();
    const notes = rawNotes.trim();

    if (strictStatus && status === 'unknown') {
      if (debug) console.warn(`Line ${index + 1} has invalid status: '${rawStatus}'. Marked as unknown.`);
    }

    stops.push({ address, status, notes });
  }

  if (debug) console.log(`Parsed ${stops.length} stops.`);

  return stops;
}
