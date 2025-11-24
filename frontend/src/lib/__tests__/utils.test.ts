import {
  levenshteinDistance,
  findSimilarCity,
  formatAddress,
  formatPhone,
  safeValue,
} from '../utils';
import type { Lead } from '../../types/lead';

describe('levenshteinDistance', () => {
  it('should return 0 for identical strings', () => {
    expect(levenshteinDistance('test', 'test')).toBe(0);
  });

  it('should return correct distance for different strings', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('hello', 'hallo')).toBe(1);
  });

  it('should handle empty strings', () => {
    expect(levenshteinDistance('', 'test')).toBe(4);
    expect(levenshteinDistance('test', '')).toBe(4);
    expect(levenshteinDistance('', '')).toBe(0);
  });
});

describe('findSimilarCity', () => {
  it('should return exact match', () => {
    expect(findSimilarCity('New York')).toBe('New York');
    expect(findSimilarCity('new york')).toBe('New York');
    expect(findSimilarCity('NEW YORK')).toBe('New York');
  });

  it('should return city that starts with input', () => {
    expect(findSimilarCity('New')).toBe('New York');
    expect(findSimilarCity('San')).toBe('San Francisco');
  });

  it('should return null for empty input', () => {
    expect(findSimilarCity('')).toBeNull();
    expect(findSimilarCity('   ')).toBeNull();
  });

  it('should return null for no match', () => {
    expect(findSimilarCity('xyzabc123')).toBeNull();
  });

  it('should handle similar but not exact matches', () => {
    const result = findSimilarCity('New Yrk');
    // Should find "New York" due to similarity
    expect(result).toBe('New York');
  });
});

describe('formatAddress', () => {
  it('should return address if present', () => {
    const lead: Lead = {
      id: 1,
      name: 'Test',
      address: '123 Main St',
      street: null,
      housenumber: null,
      city: null,
      category: null,
      website: null,
      phone: null,
      lat: null,
      lon: null,
      source: null,
    };
    expect(formatAddress(lead)).toBe('123 Main St');
  });

  it('should combine street, housenumber, and city', () => {
    const lead: Lead = {
      id: 1,
      name: 'Test',
      address: null,
      street: 'Main Street',
      housenumber: '123',
      city: 'New York',
      category: null,
      website: null,
      phone: null,
      lat: null,
      lon: null,
      source: null,
    };
    expect(formatAddress(lead)).toBe('Main Street 123 New York');
  });

  it('should return "—" when no address data', () => {
    const lead: Lead = {
      id: 1,
      name: 'Test',
      address: null,
      street: null,
      housenumber: null,
      city: null,
      category: null,
      website: null,
      phone: null,
      lat: null,
      lon: null,
      source: null,
    };
    expect(formatAddress(lead)).toBe('—');
  });

  it('should handle partial address data', () => {
    const lead: Lead = {
      id: 1,
      name: 'Test',
      address: null,
      street: 'Main Street',
      housenumber: null,
      city: 'New York',
      category: null,
      website: null,
      phone: null,
      lat: null,
      lon: null,
      source: null,
    };
    expect(formatAddress(lead)).toBe('Main Street New York');
  });
});

describe('formatPhone', () => {
  it('should remove leading apostrophe', () => {
    expect(formatPhone("'+1234567890")).toBe('+1234567890');
    expect(formatPhone("'123-456-7890")).toBe('123-456-7890');
  });

  it('should return phone as-is if no apostrophe', () => {
    expect(formatPhone('+1234567890')).toBe('+1234567890');
    expect(formatPhone('123-456-7890')).toBe('123-456-7890');
  });

  it('should return "—" for null or undefined', () => {
    expect(formatPhone(null)).toBe('—');
    expect(formatPhone(undefined)).toBe('—');
  });

  it('should return "—" for empty string', () => {
    expect(formatPhone('')).toBe('—');
  });
});

describe('safeValue', () => {
  it('should return empty string for null or undefined', () => {
    expect(safeValue(null)).toBe('');
    expect(safeValue(undefined)).toBe('');
  });

  it('should convert numbers to strings', () => {
    expect(safeValue(123)).toBe('123');
    expect(safeValue(0)).toBe('0');
  });

  it('should handle strings without special characters', () => {
    expect(safeValue('test')).toBe('test');
    expect(safeValue('hello world')).toBe('hello world');
  });

  it('should escape strings with commas', () => {
    expect(safeValue('test,value')).toBe('"test,value"');
  });

  it('should escape strings with quotes', () => {
    expect(safeValue('test"value')).toBe('"test""value"');
  });

  it('should escape strings with both commas and quotes', () => {
    expect(safeValue('test, "value"')).toBe('"test, ""value"""');
  });
});

