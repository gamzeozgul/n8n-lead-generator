# Testing Guide

This project uses **Jest** and **React Testing Library** for unit and component testing.

## Setup

Tests are already configured. Just install dependencies:

```bash
npm install
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are located in `__tests__` directories next to the files they test:

```
src/
├── lib/
│   ├── utils.ts
│   └── __tests__/
│       └── utils.test.ts
└── app/
    └── __tests__/
        └── page.test.tsx (future)
```

## What's Tested

### Utility Functions (`src/lib/utils.ts`)

- ✅ `levenshteinDistance()` - String similarity algorithm
- ✅ `findSimilarCity()` - City autocomplete matching
- ✅ `formatAddress()` - Address formatting from lead data
- ✅ `formatPhone()` - Phone number formatting (removes leading apostrophe)
- ✅ `safeValue()` - CSV export value escaping

## Writing New Tests

### Example: Testing a Utility Function

```typescript
import { formatPhone } from '../utils';

describe('formatPhone', () => {
  it('should remove leading apostrophe', () => {
    expect(formatPhone("'+1234567890")).toBe('+1234567890');
  });

  it('should return "—" for null', () => {
    expect(formatPhone(null)).toBe('—');
  });
});
```

### Example: Testing a React Component

```typescript
import { render, screen } from '@testing-library/react';
import Home from '../app/page';

describe('Home', () => {
  it('should render search form', () => {
    render(<Home />);
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
  });
});
```

## Test Coverage

Current coverage focuses on:
- ✅ Helper functions (100% coverage)
- ⏳ React components (to be added)
- ⏳ Integration tests (to be added)

## Best Practices

1. **Test behavior, not implementation** - Focus on what the function does, not how
2. **Use descriptive test names** - "should remove leading apostrophe" not "test1"
3. **Test edge cases** - null, undefined, empty strings, special characters
4. **Keep tests simple** - One assertion per test when possible
5. **Mock external dependencies** - Don't make real API calls in tests

## Common Test Patterns

### Testing Functions with Multiple Cases

```typescript
describe('formatAddress', () => {
  it.each([
    [{ address: '123 Main St' }, '123 Main St'],
    [{ street: 'Main', city: 'NY' }, 'Main NY'],
    [{}, '—'],
  ])('should format address correctly', (lead, expected) => {
    expect(formatAddress(lead as Lead)).toBe(expected);
  });
});
```

### Testing Async Functions

```typescript
it('should handle API errors', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
  
  // Your test code here
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

## Troubleshooting

**Tests not running?**
- Make sure `node_modules` is installed: `npm install`
- Check `jest.config.js` is in the root directory

**TypeScript errors in tests?**
- Make sure `@types/jest` is installed (included in devDependencies)
- Check `tsconfig.json` includes test files

**Tests failing?**
- Run with `--verbose` flag: `npm test -- --verbose`
- Check test output for specific error messages

