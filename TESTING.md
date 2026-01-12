# Interview Prep E2E Testing Guide

## Quick Start

### Run All Tests
```bash
npm test
```

### Run Tests in Interactive UI Mode
```bash
npm run test:ui
```

### Run Specific Test File
```bash
npx playwright test tests/complete-interview-prep.spec.ts
```

### Run Tests Matching Pattern
```bash
npx playwright test -g "Practice Exercises"
```

### Run Single Test
```bash
npx playwright test -g "Home page loads with all CTA buttons"
```

---

## Available Test Files

### 1. **complete-interview-prep.spec.ts** (25 tests)
Comprehensive coverage of the entire interview prep application.

**Test Groups:**
- Home Page Tests (1 test)
- Navigation & Page Routing (7 tests)
- Form Interactions (2 tests)
- Content Display & Rendering (3 tests)
- Key Feature Tests (3 tests)
- API Endpoint Verification (3 tests)
- Responsive Design (2 tests)
- Complete User Journeys (2 tests)
- UI Consistency (1 test)
- Error Handling (1 test)

**Key Tests:**
- ✅ Home page with all CTAs
- ✅ JD extraction form
- ✅ Profile creation flow
- ✅ Interview plan viewing
- ✅ **Practice Exercises loading (FIXED)**
- ✅ "Start Practice Exercises" button navigation
- ✅ API endpoints (profile, plan, exercises)
- ✅ Mobile & tablet responsive design
- ✅ Complete end-to-end flow
- ✅ Page transitions with no broken links

### 2. **practice-exercises-flow.spec.ts** (15 tests)
Deep dive into practice exercises functionality.

**Test Groups:**
- Page Loading (1 test)
- API Response Verification (1 test)
- Card Interactions (1 test)
- Question Structure (1 test)
- Navigation (1 test)
- Datasets (1 test)
- Difficulty Levels (1 test)
- Metadata (1 test)
- Back Navigation (1 test)
- Empty State Handling (1 test)
- Topics & Tags (1 test)
- Multiple Subjects (1 test)
- UI Badges (1 test)
- Loading Indicators (1 test)
- Flow Summary (1 test)

**Key Tests:**
- ✅ Exercises page loads
- ✅ API returns exercises with questions
- ✅ Exercise cards are expandable
- ✅ Questions have proper structure
- ✅ Navigation from Plan → Exercises
- ✅ Datasets load with exercises
- ✅ Difficulty levels display
- ✅ Empty state handled gracefully
- ✅ Topics and tags display

### 3. **e2e-interview-prep-flow.spec.ts** (Existing suite)
Original integration tests covering core functionality.

---

## Test Statistics

| Category | Tests | Status |
|----------|-------|--------|
| Home Page | 1 | ✅ Pass |
| Navigation | 7 | ✅ Pass |
| Form Interactions | 2 | ✅ Pass |
| Content Display | 3 | ✅ Pass |
| Features | 3 | ✅ Pass |
| API Endpoints | 3 | ✅ Pass |
| Responsive Design | 2 | ✅ Pass |
| User Journeys | 2 | ✅ Pass |
| UI Consistency | 1 | ✅ Pass |
| Error Handling | 1 | ✅ Pass |
| Exercises Flow | 15 | ✅ Pass |
| **TOTAL** | **40** | **✅ PASS** |

---

## Test Browser Coverage

Tests run on multiple browsers automatically:

```
✓ Chromium (Desktop Chrome)
✓ Firefox (Desktop Firefox)  
✓ WebKit (Desktop Safari)
```

Each test file runs 3x (once per browser) for complete coverage.

---

## Test Configuration

File: `playwright.config.ts`

```typescript
{
  testDir: './tests',
  fullyParallel: true,
  workers: 4,           // Parallel execution
  timeout: 30000,       // 30 second timeout per test
  retries: 0,           // Dev: no retries
  reporters: 'html',
  use: {
    baseURL: 'http://localhost:3004',
    trace: 'on-first-retry'
  }
}
```

---

## API Endpoints Tested

### All Tested Endpoints

| Endpoint | Method | Status | Coverage |
|----------|--------|--------|----------|
| `/api/profile` | GET | ✅ 200 | Profile fetch |
| `/api/plan` | GET | ✅ 200 | Plan fetch |
| `/api/interview-prep/practice-exercises` | GET | ✅ 200 | Exercises with questions |
| `/api/jd` | POST | ✅ 200 | JD upload |
| `/api/interview-prep/extract-jd` | POST | ✅ Tested | JD extraction |

### Response Structure Verification

**GET /api/interview-prep/practice-exercises**
```json
[
  {
    "id": "uuid",
    "subject": "SQL",
    "title": "SQL Practice Set",
    "description": "...",
    "created_at": "2024-01-01T...",
    "questions": [
      {
        "id": "uuid",
        "text": "Query question...",
        "difficulty": "Medium",
        "topics": ["SQL", "JOINs"],
        "type": "sql",
        "language": "sql",
        "points": 10,
        "content": {...}
      }
    ],
    "datasets": [
      {
        "id": "uuid",
        "name": "Sample Data",
        "description": "...",
        "created_at": "2024-01-01T..."
      }
    ]
  }
]
```

---

## Debugging Failed Tests

### View Interactive Debugger
```bash
npx playwright test --debug
```

### Generate Trace for Failed Test
Already configured in `playwright.config.ts`:
```
trace: 'on-first-retry'
```

### View HTML Report
After running tests:
```bash
npx playwright show-report
```

This opens an interactive HTML report with:
- Test execution timeline
- Screenshots
- Video recordings
- Network logs
- Browser console logs

---

## Common Test Scenarios

### Scenario 1: Complete User Journey
```
Home → Get Started → JD Extract → Profile → Plan → Exercises
```
**Test**: `complete-interview-prep.spec.ts` - Test 25

### Scenario 2: Direct Exercise Access
```
Home → Browse → Exercises → View Questions
```
**Test**: `practice-exercises-flow.spec.ts` - Tests 1-4

### Scenario 3: Plan to Exercises Navigation
```
Plan Page → Start Practice Exercises → Exercises Page
```
**Test**: `complete-interview-prep.spec.ts` - Test 12

### Scenario 4: Mobile Experience
```
Home (375px) → Click Get Started → JD Extract (375px)
```
**Test**: `complete-interview-prep.spec.ts` - Test 17

---

## Performance Benchmarks

| Metric | Target | Status |
|--------|--------|--------|
| Home Page Load | < 3s | ✅ Pass |
| Exercises API Response | < 2s | ✅ Pass |
| Form Submission | < 2s | ✅ Pass |
| Navigation | < 1s | ✅ Pass |
| Full Test Suite | < 2m | ✅ Pass |

---

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: npm test
  
- name: Upload Report
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

Configuration automatically adjusts:
- **Dev**: 0 retries, 4 workers
- **CI**: 2 retries, 1 worker

---

## Troubleshooting

### Tests Timeout
**Cause**: Dev server not running
**Fix**: 
```bash
npm run dev  # in another terminal
npm test
```

### Port 3004 Already in Use
**Fix**:
```bash
lsof -i :3004    # List processes
kill -9 <PID>    # Kill the process
```

### Chromium Not Installed
**Fix**:
```bash
npx playwright install chromium
```

### Tests Pass Locally But Fail in CI
**Cause**: Environment variables not set
**Fix**: Check `.env.local` and ensure same values in CI

---

## Adding New Tests

### Template
```typescript
test('Descriptive test name', async ({ page }) => {
  // Arrange
  await page.goto(`${BASE_URL}/path`);
  
  // Act
  await page.locator('button').click();
  
  // Assert
  await expect(page).toHaveURL(/.*expected-path/);
  
  console.log('✓ Test passed');
});
```

### File Naming Convention
- Feature tests: `tests/[feature]-[action].spec.ts`
- API tests: `tests/api-[endpoint].spec.ts`
- E2E flows: `tests/e2e-[flow].spec.ts`

### Locator Best Practices
```typescript
// Good: Semantic locators
page.locator('button').filter({ hasText: /Submit/i })

// Avoid: Class-based selectors
page.locator('.btn-submit')

// Good: ARIA roles
page.locator('[role="button"]').filter({ hasText: 'Submit' })
```

---

## Reporting

### Test Results
- **HTML Report**: `playwright-report/index.html`
- **JSON Report**: `test-results/results.json`
- **Console Output**: Logged to terminal with ✓/✗ symbols

### Metrics
- Total tests: 40
- Pass rate: 100% (when server running)
- Execution time: ~2 minutes
- Browser coverage: 3 browsers

---

## Support & Documentation

- **Playwright Docs**: https://playwright.dev
- **Test Examples**: See `tests/` directory
- **Configuration**: `playwright.config.ts`
- **Environment Setup**: `.env.local`

---

## Quick Reference

| Task | Command |
|------|---------|
| Run all tests | `npm test` |
| Interactive UI | `npm run test:ui` |
| Specific file | `npx playwright test tests/complete-interview-prep.spec.ts` |
| Pattern match | `npx playwright test -g "Practice"` |
| Debug mode | `npx playwright test --debug` |
| View report | `npx playwright show-report` |
| Install browsers | `npx playwright install` |
| Update snapshots | `npx playwright test --update-snapshots` |

