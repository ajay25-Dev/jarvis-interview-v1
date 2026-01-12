import { useCallback, useState } from 'react';
import { Dataset, TestCase } from '@/components/practice/types';
import { PracticeExerciseAPI, SubmissionResult as ApiSubmissionResult } from '@/lib/api-bridge';
import { usePracticeContext } from '@/contexts/PracticeContext';

export function useCodeExecution() {
  const {
    currentExerciseId,
    currentQuestionId,
    code,
    language,
    setExecutionResults,
    addSubmission,
  } = usePracticeContext();

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const executeCode = useCallback(async () => {
    if (!currentExerciseId || !currentQuestionId) {
      setExecutionError('Missing exercise or question ID');
      return null;
    }

    if (!code.trim()) {
      setExecutionError('Please enter code');
      return null;
    }

    try {
      setIsExecuting(true);
      setExecutionError(null);

      const result = await PracticeExerciseAPI.executeCode(
        currentExerciseId,
        currentQuestionId,
        code,
        language
      );

      setExecutionResults(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setExecutionError(errorMessage);
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [currentExerciseId, currentQuestionId, code, language, setExecutionResults]);

  const submitCode = useCallback(async (testCases?: TestCase[], datasets?: Dataset[]) => {
    if (!currentExerciseId || !currentQuestionId) {
      setExecutionError('Missing exercise or question ID');
      return null;
    }

    if (!code.trim()) {
      setExecutionError('Please enter code');
      return null;
    }

    try {
      setIsExecuting(true);
      setExecutionError(null);

      const result: ApiSubmissionResult = await PracticeExerciseAPI.submitAnswer(
        currentExerciseId,
        currentQuestionId,
        code,
        language,
        testCases,
        datasets
      );

      setExecutionResults({
        success: result.success,
        passed: result.passed,
        score: result.score,
        total_points: result.total_points,
        test_results: result.test_results || [],
        overall_result: {
          stdout: result.feedback || '',
          stderr: '',
          execution_time: 0,
          memory_used: 0,
          exit_code: 0,
        },
      });

      addSubmission({
        success: result.success,
        passed: result.passed || false,
        score: result.score || 0,
        total_points: result.total_points || 0,
        feedback: result.feedback,
        timestamp: new Date().toISOString(),
        attempt_id: result.attempt_id,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setExecutionError(errorMessage);
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [currentExerciseId, currentQuestionId, code, language, setExecutionResults, addSubmission]);

  const clearError = useCallback(() => {
    setExecutionError(null);
  }, []);

  return {
    executeCode,
    submitCode,
    isExecuting,
    executionError,
    clearError,
  };
}
