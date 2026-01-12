# Test Commands Quick Reference

## Running Tests

### Start Dev Server (if not already running)
```bash
npm run dev
```

### Run All Tests
```bash
npm test
```

### Run Tests in UI Mode (Interactive)
```bash
npm run test:ui
```

### Run Specific Test File
```bash
npx playwright test tests/complete-interview-prep.spec.ts
npx playwright test tests/practice-exercises-flow.spec.ts
npx playwright test tests/e2e-interview-prep-flow.spec.ts
```

### Run Tests Matching Pattern
```bash
npx playwright test -g "Home page"
npx playwright test -g "Practice"
npx playwright test -g "API endpoint"
npx playwright test -g "Navigation"
```

### Run Single Test
```bash
npx playwright test -g "Home page loads with all CTA buttons"
npx playwright test -g "Start Practice Exercises button"
npx playwright test -g "Exercises API returns correct structure"
```

---

## Debugging

### Debug Mode (Step Through Tests)
```bash
npx playwright test --debug
```

### Debug Specific Test
```bash
npx playwright test -g "Test Name" --debug
```

### Generate Trace (for debugging failures)
```bash
npx playwright test --trace on
```

### Show Report
```bash
npx playwright show-report
```

---

## Test Filtering

### Run Only Tests Containing "Exercises"
```bash
npx playwright test -g "Exercises"
```

### Run Tests on Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run Tests on Single Browser
```bash
npx playwright test -g "Home page" --project=chromium
```

---

## Verbose Output

### Show More Details
```bash
npx playwright test --reporter=list
```

### Show Detailed Info with Screenshots
```bash
npx playwright test --reporter=html
npx playwright show-report
```

---

## Failure Handling

### Re-run Failed Tests Only
```bash
npx playwright test --only-changed
```

### Update Snapshots
```bash
npx playwright test --update-snapshots
```

### Run with Verbose Logging
```bash
DEBUG=pw:api npx playwright test
```

---

## Performance Testing

### Measure Test Performance
```bash
time npm test
```

### Run Tests with Reduced Parallelization
```bash
npx playwright test --workers=1
```

---

## Specific Test Runs

### Test Interview Prep Flow
```bash
npx playwright test tests/complete-interview-prep.spec.ts -g "Complete interview prep flow summary"
```

### Test Practice Exercises Only
```bash
npx playwright test tests/practice-exercises-flow.spec.ts
```

### Test API Endpoints
```bash
npx playwright test -g "API endpoint"
```

### Test Responsive Design
```bash
npx playwright test -g "Responsive design"
```

### Test Navigation
```bash
npx playwright test -g "Navigate"
```

### Test Forms
```bash
npx playwright test -g "form"
```

---

## Live Browser Testing

### Run Tests and Keep Browser Open
```bash
npx playwright test --headed
```

### Run on Specific Browser in Headed Mode
```bash
npx playwright test --headed --project=chromium
```

### Slow Motion (500ms between steps)
```bash
npx playwright test --headed --project=chromium --workers=1 --timeout=60000 --headed --slow-mo=500
```

---

## Report Generation

### Generate HTML Report After Tests
```bash
npm test
npx playwright show-report
```

### View Existing Report
```bash
npx playwright show-report playwright-report
```

---

## Count Tests

### List All Tests
```bash
npx playwright test --list
```

### Count Tests in Specific File
```bash
npx playwright test tests/complete-interview-prep.spec.ts --list
```

---

## Useful Combinations

### Run + Debug + Show Report
```bash
npm test
npx playwright show-report
```

### Full Debug Experience
```bash
npx playwright test --headed --project=chromium --workers=1 --debug
```

### Test Everything with Details
```bash
npx playwright test --reporter=verbose
npx playwright show-report
```

### Quick Smoke Test
```bash
npx playwright test -g "Home page" --project=chromium
```

---

## Environment Setup

### Install Playwright Browsers
```bash
npx playwright install
```

### Update Playwright
```bash
npm install @playwright/test@latest
npx playwright install
```

---

## Useful Environment Variables

### Run Tests with Debug Logging
```bash
DEBUG=pw:api npm test
```

### Run with Extended Timeout (5 minutes)
```bash
npx playwright test --timeout=300000
```

### Run with Custom Base URL
```bash
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 npm test
```

---

## Clean Up

### Remove Test Results
```bash
rm -rf test-results/
rm -rf playwright-report/
```

### Clean and Re-run
```bash
rm -rf test-results/ playwright-report/
npm test
```

---

## CI/CD Commands

### GitHub Actions Format
```yaml
- name: Run tests
  run: npm test

- name: Upload report
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

---

## Most Useful Commands

| Task | Command |
|------|---------|
| Run all tests | `npm test` |
| Interactive mode | `npm run test:ui` |
| Debug failing test | `npx playwright test -g "Test Name" --debug` |
| View report | `npx playwright show-report` |
| Test specific file | `npx playwright test tests/[file].spec.ts` |
| Filter by name | `npx playwright test -g "pattern"` |
| Headed browser | `npx playwright test --headed` |
| List all tests | `npx playwright test --list` |
| Single browser | `npx playwright test --project=chromium` |
| Show details | `npx playwright test --reporter=verbose` |

---

## Example Workflows

### Before Committing Code
```bash
npm test
npx playwright show-report
```

### Debugging a Single Test
```bash
npx playwright test -g "Home page loads with all CTA buttons" --debug
```

### Testing New Feature
```bash
npx playwright test -g "Practice Exercises" --headed --project=chromium
npx playwright show-report
```

### Full CI Pipeline
```bash
npm test
echo "Tests completed - check report"
npx playwright show-report
```

---

## Troubleshooting Commands

### Check if Server is Running
```bash
curl http://localhost:3004
```

### Start Fresh Dev Server
```bash
npm run dev
```

### Kill Existing Server (Windows)
```bash
netstat -ano | findstr :3004
taskkill /PID <PID> /F
```

### Kill Existing Server (Mac/Linux)
```bash
lsof -i :3004
kill -9 <PID>
```

### Install All Dependencies
```bash
npm install
```

### Update Playwright
```bash
npm install -D @playwright/test@latest
npx playwright install
```

---

## Notes

- Tests require dev server running on port 3004
- All commands should be run from `jarvis-interview` directory
- Reports are generated in `playwright-report/` after each run
- Tests run parallel on 4 workers by default (adjust with `--workers`)
- Timeout is 30 seconds per test (adjust with `--timeout`)

