import { useCallback, useState } from 'react';
import { PracticeExerciseAPI } from '@/lib/api-bridge';
import { usePracticeContext } from '@/contexts/PracticeContext';

export function useHint() {
  const {
    currentExerciseId,
    currentQuestionId,
    code,
    hints,
    addHint,
  } = usePracticeContext();

  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);

  const requestHint = useCallback(
    async (extras?: {
      question?: string;
      datasetContext?: string;
      expectedAnswer?: string;
    }) => {
    if (!currentExerciseId || !currentQuestionId) {
      setHintError('Missing exercise or question ID');
      return null;
    }

    try {
      setIsLoadingHint(true);
      setHintError(null);

      const result = await PracticeExerciseAPI.requestHint(
        currentExerciseId,
        currentQuestionId,
        code,
        extras,
      );

      addHint({
        success: result.success,
        message: result.message,
        hint: result.hint,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setHintError(errorMessage);
      return null;
    } finally {
      setIsLoadingHint(false);
    }
  }, [currentExerciseId, currentQuestionId, code, addHint]);

  const clearError = useCallback(() => {
    setHintError(null);
  }, []);

  return {
    requestHint,
    isLoadingHint,
    hintError,
    clearError,
    totalHintsUsed: hints.length,
  };
}
