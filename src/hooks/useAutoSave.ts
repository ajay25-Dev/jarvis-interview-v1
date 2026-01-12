import { useEffect, useRef, useCallback } from 'react';
import { usePracticeContext } from '@/contexts/PracticeContext';

interface UseAutoSaveOptions {
  interval?: number;
  onSave?: () => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export function useAutoSave(options: UseAutoSaveOptions = {}) {
  const {
    interval = 30000,
    onSave,
    onError,
    enabled = true,
  } = options;

  const { code, saveProgress, lastSaved } = usePracticeContext();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>('');

  const performSave = useCallback(async () => {
    try {
      await saveProgress();
      onSave?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, [saveProgress, onSave, onError]);

  const triggerSave = useCallback(() => {
    if (!enabled) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(performSave, 1000);
  }, [enabled, performSave]);

  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(performSave, interval);

    return () => {
      clearInterval(intervalId);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [interval, enabled, performSave]);

  useEffect(() => {
    const hasChanges = code !== lastSaveRef.current;
    if (hasChanges) {
      lastSaveRef.current = code;
      triggerSave();
    }
  }, [code, triggerSave]);

  return {
    lastSaved,
    isSaving: false,
    triggerSave: performSave,
  };
}
