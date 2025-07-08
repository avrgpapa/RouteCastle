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
 * Detects column indexes from header line for address, status, notes.
 * @param {string} headerLine
 * @returns {{address: number, status: number, notes: number}} column index map
 */
function detectColumns(headerLine) {
  const headers = headerLine
    .toLowerCase()
    .split(/[\t,|]/)
    .map(h => h.trim());

  return {
    address: headers.findIndex(h => h.includes('address')),
    status: headers.findIndex(h => h.includes('status')),
    notes: headers.findIndex(h => h.includes('notes')),
  };
}

/**
 * Parses route sheet text from OCR or CSV input.
 * Supports auto-detection of column order from header row.
 * Returns array of {address, status, notes}.
 * 
 * @param {string} rawText - The input text to parse
 * @param {boolean} [strictMode=false] - Whether to require valid statuses
 * @param {boolean} [hasHeader=true] - Whether first line is header row
 * @returns {Array<{address: string, status: string, notes: string}>} Parsed stops
 */
export function parseRouteSheet(rawText, strictMode = false, hasHeader = true) {
  if (!rawText || typeof rawText !== 'string') {
    console.warn(`Invalid parseRouteSheet input: ${typeof rawText}`, rawText);
    return [];
  }

  const lines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  let columnMapping = {
    address: 0,
    status: 1,
    notes: 2,
  };

  let dataLines = lines;

  if (hasHeader) {
    columnMapping = detectColumns(lines[0]);
    dataLines = lines.slice(1);

    // If any required column is missing, fallback to default indexes
    if (
      columnMapping.address === -1 &&
      columnMapping.status === -1 &&
      columnMapping.notes === -1
    ) {
      columnMapping = { address: 0, status: 1, notes: 2 };
      dataLines = lines; // treat all lines as data
    }
  }

  const stops = [];

  for (const line of dataLines) {
    let parts = [];

    if (line.includes('\t')) {
      parts = line.split('\t').map(p => p.trim());
    } else if (line.includes(',')) {
      parts = parseCSVLine(line);
    } else {
      const normalized = line.replace(/\s{2,}/g, '|');
      parts = normalized.split('|').map(p => p.trim());
    }

    const rawAddress = parts[columnMapping.address];
    const rawStatus = parts[columnMapping.status] || '';
    const rawNotes = parts[columnMapping.notes] || '';

    if (!rawAddress) continue;

    const address = normalizeAddress(rawAddress);
    const status = strictMode ? validateStatus(rawStatus) : rawStatus.toLowerCase();
    const notes = rawNotes.trim();

    stops.push({ address, status, notes });
  }

  return stops;
}
