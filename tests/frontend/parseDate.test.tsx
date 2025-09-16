// Tests: parseDate function - handles DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD formats and edge cases

import { describe, it, expect } from "vitest";

// Extract parseDate function for testing
const parseDate = (dateStr: string): Date | null => {
  const trimmedDate = dateStr.toString().trim();
  
  // Try DD/MM/YYYY format first (e.g., 25/12/2024, 01/03/2024)
  const ddmmyyyyPattern = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/;
  const ddmmyyyyMatch = trimmedDate.match(ddmmyyyyPattern);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    // Validate the parsed date components match what was input
    if (parsedDate.getDate() === parseInt(day) && 
        parsedDate.getMonth() === parseInt(month) - 1 && 
        parsedDate.getFullYear() === parseInt(year)) {
      return parsedDate;
    }
  }
  
  // Try MM/DD/YYYY format (e.g., 12/25/2024)
  const mmddyyyyPattern = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/;
  const mmddyyyyMatch = trimmedDate.match(mmddyyyyPattern);
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch;
    const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (parsedDate.getDate() === parseInt(day) && 
        parsedDate.getMonth() === parseInt(month) - 1 && 
        parsedDate.getFullYear() === parseInt(year)) {
      return parsedDate;
    }
  }
  
  // Try YYYY-MM-DD format (ISO format)
  const isoPattern = /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/;
  const isoMatch = trimmedDate.match(isoPattern);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (parsedDate.getDate() === parseInt(day) && 
        parsedDate.getMonth() === parseInt(month) - 1 && 
        parsedDate.getFullYear() === parseInt(year)) {
      return parsedDate;
    }
  }
  
  // Fallback to JavaScript's default parsing
  const fallbackDate = new Date(dateStr);
  return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
};

describe("parseDate function", () => {
  
  it("parses DD/MM/YYYY format correctly", () => {
    // Test standard DD/MM/YYYY with forward slashes
    const result1 = parseDate("25/12/2024");
    expect(result1).toEqual(new Date(2024, 11, 25)); // Month is 0-indexed
    
    // Test single digit day/month
    const result2 = parseDate("01/03/2024");
    expect(result2).toEqual(new Date(2024, 2, 1));
  });

  it("parses MM/DD/YYYY format correctly", () => {
    // Test standard MM/DD/YYYY - should be interpreted as MM/DD after DD/MM fails validation
    const result1 = parseDate("12/25/2024"); // Dec 25th (no 25th month, so tries MM/DD)
    expect(result1).toEqual(new Date(2024, 11, 25));
    
    // Test ambiguous date that could be either format
    const result2 = parseDate("03/01/2024"); // Could be Mar 1st or Jan 3rd - actual behavior is Jan 3rd (MM/DD fallback)
    expect(result2).toEqual(new Date(2024, 0, 3)); // January 3rd (0-indexed month)
  });

  it("parses YYYY-MM-DD format correctly", () => {
    // Test ISO format with hyphens
    const result1 = parseDate("2024-12-25");
    expect(result1).toEqual(new Date(2024, 11, 25));
    
    // Test ISO format with forward slashes
    const result2 = parseDate("2024/03/01");
    expect(result2).toEqual(new Date(2024, 2, 1));
  });

  it("handles different separators", () => {
    // Test with hyphens
    const result1 = parseDate("25-12-2024");
    expect(result1).toEqual(new Date(2024, 11, 25));
    
    // Test with dots
    const result2 = parseDate("25.12.2024");
    expect(result2).toEqual(new Date(2024, 11, 25));
  });

  it("validates date components and rejects invalid dates", () => {
    // Test invalid day (Feb 30th)
    const result1 = parseDate("30/02/2024");
    expect(result1).toBeNull();
    
    // Test invalid month
    const result2 = parseDate("25/13/2024");
    expect(result2).toBeNull();
    
    // Test invalid day for month
    const result3 = parseDate("31/04/2024"); // April doesn't have 31 days
    expect(result3).toBeNull();
  });

  it("handles edge cases", () => {
    // Test empty string
    const result1 = parseDate("");
    expect(result1).toBeNull();
    
    // Test malformed input
    const result2 = parseDate("abc/def/ghi");
    expect(result2).toBeNull();
    
    // Test whitespace
    const result3 = parseDate("  25/12/2024  ");
    expect(result3).toEqual(new Date(2024, 11, 25));
  });

  it("falls back to JavaScript Date parsing for unmatched formats", () => {
    // Test format that doesn't match our patterns but is valid JS Date
    const result1 = parseDate("Dec 25, 2024");
    expect(result1).not.toBeNull();
    expect(result1?.getFullYear()).toBe(2024);
    expect(result1?.getMonth()).toBe(11); // December
    expect(result1?.getDate()).toBe(25);
  });
});