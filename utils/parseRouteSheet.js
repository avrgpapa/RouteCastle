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
 * Validates and standardizes status values
 * @param {string} status - Raw status string
 * @returns {string} Validated status
 */
function validateStatus(status) {
  const ALLOWED_STATUSES = ['active', 'suspended', 'canceled'];
  const normalized = status.toLowerCase();
  return ALLOWED_STATUSES.includes(normalized) ? normalized : 'unknown';
}

/**
 * Parses route sheet text from OCR or CSV input.
 * Supports tabs, multi-space, commas, and quoted CSV fields.
 * Returns array of {address, status, notes}.
 * 
 * @example
 * // Tab-separated
 * parseRouteSheet('123 Main St\tActive\tLeave at door')
 * // Returns [{ address: '123 Main St', status: 'active', notes: 'Leave at door' }]
 * 
 * @example
 * // CSV with quotes
 * parseRouteSheet('"456 Oak Dr, Apt 2", Suspended, "Customer request"')
 * // Returns [{ address: '456 Oak Dr, Apt 2', status: 'suspended', notes: 'Customer request' }]
 * 
 * @param {string} rawText - The input text to parse
 * @param {boolean} [strictMode=false] - Whether to require valid statuses
 * @returns {Array<{address: string, status: string, notes: string}>} Parsed stops
 */
export function parseRouteSheet(rawText, strictMode = false) {
  if (!rawText || typeof rawText !== 'string') {
    console.warn(`Invalid parseRouteSheet input: ${typeof rawText}`, rawText);
    return [];
  }

  const lines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const stops = [];

  for (const line of lines) {
    let parts = [];

    // Determine delimiter and parse accordingly
    if (line.includes('\t')) {
      parts = line.split('\t').map(p => p.trim());
    } else if (line.includes(',')) {
      parts = parseCSVLine(line);
    } else {
      const normalized = line.replace(/\s{2,}/g, '|');
      parts = normalized.split('|').map(p => p.trim());
    }

    // Extract components with defaults
    const [rawAddress, rawStatus = '', rawNotes = ''] = parts;
    if (!rawAddress) continue;

    // Process fields
    const address = normalizeAddress(rawAddress);
    const status = strictMode ? validateStatus(rawStatus) : rawStatus.toLowerCase();
    const notes = rawNotes.trim();

    stops.push({ address, status, notes });
  }

  return stops;
}
