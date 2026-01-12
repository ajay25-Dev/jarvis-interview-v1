
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3004';

test.describe('Subject Filtering and Data Population', () => {
  test('1: Navigate from Plan to Exercises with Subject', async ({ page }) => {
    // 1. Go to Plan page
    await page.goto(`${BASE_URL}/plan`);
    
    // Wait for plan to load
    await expect(page.locator('h1')).toContainText('Your Personalized Interview Prep Plan');
    
    // 2. Find and expand SQL subject
    // Note: We assume SQL is in the plan based on the debug output
    const sqlHeader = page.locator('h3').filter({ hasText: 'SQL' });
    await expect(sqlHeader).toBeVisible();
    
    // Click to expand
    await sqlHeader.click();
    
    // 3. Click "Start SQL Practice" button
    const startBtn = page.locator('a').filter({ hasText: 'Start SQL Practice' });
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    
    // 4. Verify URL
    await expect(page).toHaveURL(/.*\/exercises\?subject=SQL/);
    
    // 5. Verify Exercises page loads
    await expect(page.locator('h1, span.text-lg')).toContainText('Practice Exercises');
    
    // 6. Verify SQL section is automatically expanded
    // The expanded card should show "Question 1"
    const questionTitle = page.locator('h3').filter({ hasText: 'Question 1' });
    await expect(questionTitle).toBeVisible({ timeout: 10000 });
    
    // 7. Verify question content
    const questionText = page.locator('p.text-sm.text-gray-600').first();
    await expect(questionText).toBeVisible();
    
    console.log('✓ Subject filtering and data population verified');
  });

  test('2: Verify API returns data for subject', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/interview-prep/practice-exercises?subject=SQL`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeGreaterThan(0);
    
    const exercise = data[0];
    expect(exercise.subject).toBe('SQL');
    expect(exercise.questions.length).toBeGreaterThan(0);
    
    console.log('✓ API returns correct data for subject=SQL');
  });
});
