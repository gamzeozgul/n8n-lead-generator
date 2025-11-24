import type { Lead } from "../types/lead";

// Popular cities for autocomplete (free, no API needed)
export const popularCities = [
  "San Francisco",
  "New York",
  "Los Angeles",
  "Chicago",
  "Istanbul",
  "Berlin",
  "London",
  "Paris",
  "Tokyo",
  "Sydney",
  "Toronto",
  "Vancouver",
  "Amsterdam",
  "Barcelona",
  "Rome",
  "Madrid",
  "Miami",
  "Boston",
  "Seattle",
  "Austin",
];

// Simple Levenshtein distance
export const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
};

// Simple string similarity (Levenshtein-like, simplified)
export const findSimilarCity = (input: string, threshold = 0.6): string | null => {
  const normalized = input.toLowerCase().trim();
  if (!normalized) return null;

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const city of popularCities) {
    const cityLower = city.toLowerCase();
    // Exact match
    if (cityLower === normalized) return city;
    // Starts with
    if (cityLower.startsWith(normalized) || normalized.startsWith(cityLower)) {
      return city;
    }
    // Similarity check (simple)
    const longer = normalized.length > cityLower.length ? normalized : cityLower;
    const distance = levenshteinDistance(normalized, cityLower);
    const score = 1 - distance / longer.length;
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = city;
    }
  }

  return bestMatch;
};

// Format address from lead data
export const formatAddress = (lead: Lead) => {
  if (lead.address) return lead.address;
  const parts = [lead.street, lead.housenumber, lead.city].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
};

// Format phone number (remove leading apostrophe from Google Sheets)
export const formatPhone = (phone: string | null | undefined) => {
  if (!phone) return "—";
  // Remove leading apostrophe (added by Google Sheets to prevent formula interpretation)
  return phone.startsWith("'") ? phone.slice(1) : phone;
};

// Safe value for CSV export (escape special characters)
export const safeValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

