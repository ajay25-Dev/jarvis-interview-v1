import { useState, useCallback } from 'react';
import {
  HintRequest,
  HintResponse,
} from '@/components/practice/types';
import { aiService } from '@/lib/ai-service';

export function useAIHints({
  questionId,
  question,
  expectedAnswer,
  studentAnswer,
  subject,
  topicHierarchy,
  futureTopics,
  currentCode,
  datasetContext,
  hintLevel = 'basic',
}: HintRequest) {
  const [isGeneratingHint, setIsGeneratingHint] = useState(false);
  const [lastHintRequest, setLastHintRequest] = useState<HintRequest | null>(null);
  const [hintCache, setHintCache] = useState<Map<string, HintResponse>>(new Map());
  const [hintRequestCount, setHintRequestCount] = useState(0);

  const generateHint = useCallback(async (): Promise<HintResponse | null> => {
    setIsGeneratingHint(true);
    setHintRequestCount(prev => prev + 1);
    
    try {
      // Create cache key
      const requestKey = `${questionId}-${studentAnswer}-${hintLevel}-${JSON.stringify(subject || '')}-${JSON.stringify(topicHierarchy || '')}-${JSON.stringify(futureTopics || [])}-${currentCode?.substring(0, 200) + '' || ''}-${datasetContext?.substring(0, 500) + '' || ''}`;
      
      // Check cache for basic hints (allow limited caching)
      if (hintLevel === 'basic' && hintCache.has(requestKey)) {
        console.log('[useAIHints] Using cached hint result');
        return hintCache.get(requestKey)!;
      }

      console.log('[useAIHints] Generating hint:', {
        question: question?.substring(0, 100) + '...',
        studentAnswer: studentAnswer?.substring(0, 100) + '...',
        currentCode: currentCode?.substring(0, 200) + '...',
        hintLevel,
        datasetContext: datasetContext?.substring(0, 500) + '...',
      });

      const aiRequest: HintRequest = {
        questionId,
        question,
        expectedAnswer,
        studentAnswer,
        subject,
        topicHierarchy,
        futureTopics,
        currentCode,
        datasetContext,
        hintLevel,
      };

      const result = await aiService.generateHint(aiRequest);
      
      if (result) {
        setHintCache(prev => new Map(prev).set(requestKey, result));
      }
      setLastHintRequest(aiRequest);
      
      return result;
    } catch (error) {
      console.error('[useAIHints] Hint generation failed:', error);
      return null;
    } finally {
      setIsGeneratingHint(false);
    }
  }, [
    questionId,
    question,
    expectedAnswer,
    studentAnswer,
    subject,
    topicHierarchy,
    futureTopics,
    currentCode,
    datasetContext,
    hintLevel,
    hintCache,
  ]);

  const clearCache = useCallback(() => {
    setHintCache(new Map());
    setLastHintRequest(null);
    setHintRequestCount(0);
  }, []);

  return {
    generateHint,
    isGeneratingHint,
    lastHintRequest,
    clearCache,
    hintRequestCount,
  };
}
