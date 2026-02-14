/**
 * CSV Parser for handling quoted fields with embedded commas and escaped quotes
 *
 * Handles the specific format from LunchTable CSV:
 * - Fields with commas are wrapped in double quotes
 * - Quotes inside quoted fields are escaped as double-double-quotes ("")
 */

export function parseCSV<T = Record<string, string>>(csvText: string): T[] {
  const lines = csvText.split("\n").filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return [];
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    // Create object from headers and values
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }

    rows.push(row as T);
  }

  return rows;
}

/**
 * Parses a single CSV line, handling quoted fields and escaped quotes
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      // Inside a quoted field
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote ("") -> single quote
          currentField += '"';
          i += 2; // Skip both quotes
          continue;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        // Regular character inside quotes
        currentField += char;
        i++;
        continue;
      }
    } else {
      // Outside quotes
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
        i++;
        continue;
      } else if (char === ",") {
        // Field separator
        fields.push(currentField);
        currentField = "";
        i++;
        continue;
      } else {
        // Regular character outside quotes
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push the last field
  fields.push(currentField);

  return fields;
}
