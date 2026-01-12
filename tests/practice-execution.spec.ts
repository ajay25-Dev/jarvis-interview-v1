import { test, expect } from '@playwright/test';

type PracticeExercise = {
  id: string;
  questions: { id: string }[];
  datasets?: Array<{ name?: string; table_name?: string }>;
};

const BASE_URL = 'http://localhost:3004';

test.describe('Practice Area Execution Flow', () => {
  test('1: Practice page loads with Code Editor', async ({ page }) => {
    // Navigate to the first available practice question
    // We'll use the API to find a valid link first
    const response = await page.request.get(`${BASE_URL}/api/interview-prep/practice-exercises`);
    const exercises = (await response.json()) as PracticeExercise[];
    
    if (!exercises || exercises.length === 0) {
      console.log('Skipping test: No exercises found');
      return;
    }

    const exercise = exercises[0];
    const questionId = exercise.questions[0].id;
    const url = `${BASE_URL}/practice/${exercise.id}/question/${questionId}`;

    await page.goto(url);
    
    // Verify Code Editor is visible
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.getByText('Code Editor')).toBeVisible();
  });

  test('2: Engine initializes and becomes Ready', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/interview-prep/practice-exercises`);
    const exercises = (await response.json()) as PracticeExercise[];
    if (!exercises || exercises.length === 0) return;

    const exercise = exercises[0];
    const questionId = exercise.questions[0].id;
    const url = `${BASE_URL}/practice/${exercise.id}/question/${questionId}`;

    await page.goto(url);

    // Wait for engine to be ready (timeout 60s as Pyodide/DuckDB might take time)
    await expect(page.getByText('Ready')).toBeVisible({ timeout: 60000 });
  });

  test('3: Dataset Schema is displayed', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/interview-prep/practice-exercises`);
    const exercises = (await response.json()) as PracticeExercise[];
    if (!exercises || exercises.length === 0) return;

    // Find an exercise with datasets
    const exerciseWithData = exercises.find(
      (exercise: PracticeExercise) => exercise.datasets && exercise.datasets.length > 0,
    );
    
    if (exerciseWithData) {
      const questionId = exerciseWithData.questions[0].id;
      const url = `${BASE_URL}/practice/${exerciseWithData.id}/question/${questionId}`;
      await page.goto(url);

      await expect(page.getByText('Available Tables')).toBeVisible();
      // Check if table name is visible
      const tableName = exerciseWithData.datasets[0].table_name || exerciseWithData.datasets[0].name;
      await expect(page.getByText(tableName)).toBeVisible();
    } else {
      console.log('Skipping dataset schema test: No exercises with datasets found');
    }
  });

  test('4: Code Execution works', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/interview-prep/practice-exercises`);
    const exercises = (await response.json()) as PracticeExercise[];
    if (!exercises || exercises.length === 0) return;

    const exercise = exercises[0];
    const questionId = exercise.questions[0].id;
    const url = `${BASE_URL}/practice/${exercise.id}/question/${questionId}`;

    await page.goto(url);
    
    // Wait for Ready
    await expect(page.getByText('Ready')).toBeVisible({ timeout: 60000 });

    // Type simple code
    const editor = page.locator('textarea');
    await editor.clear();
    
    // Determine language to write appropriate code
    const isSql = await page.getByText('SQL Editor').isVisible();
    
    if (isSql) {
      await editor.fill('SELECT 1 as test_col;');
    } else {
      await editor.fill('print("Hello Test")');
    }

    // Click Run
    await page.getByRole('button', { name: 'Run' }).click();

    // Verify Result
    await expect(page.getByText('Execution Result')).toBeVisible();
    
    if (isSql) {
      await expect(page.getByText('test_col')).toBeVisible();
      await expect(page.getByText('1')).toBeVisible();
    } else {
      await expect(page.getByText('Hello Test')).toBeVisible();
    }
  });
});
