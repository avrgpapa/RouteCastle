// parseRouteSheet.js

// Helper to parse CSV lines with quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

/**
 * Parses route sheet text from OCR or CSV input.
 * Supports tabs, multi-space, commas, and quoted CSV fields.
 * Returns array of {address, status, notes}.
 */
export function parseRouteSheet(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    console.warn('Invalid input passed to parseRouteSheet');
    return [];
  }

  const lines = rawText.split('\n').map(line => line.trim()).filter(Boolean);
  const stops = [];

  for (const line of lines) {
    let parts = [];

    if (line.includes('\t')) {
      // Tab-separated
      parts = line.split('\t').map(p => p.trim());
    } else if (line.includes(',')) {
      // CSV-style with quoted fields
      parts = parseCSVLine(line);
    } else {
      // Multi-space or mixed whitespace
      const normalized = line.replace(/\s{2,}/g, '|');
      parts = normalized.split('|').map(p => p.trim());
    }

    const [address, status = '', notes = ''] = parts;

    if (!address) continue;

    stops.push({ address, status, notes });
  }

  return stops;
}
