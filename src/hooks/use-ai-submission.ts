import { useState, useCallback } from 'react';
import {
  SubmissionEvaluationRequest,
  SubmissionEvaluationResponse,
  AISubmissionResult,
} from '@/components/practice/types';
import { aiService } from '@/lib/ai-service';

export function useAISubmission({
  questionId,
  question,
  expectedAnswer,
  studentAnswer,
  subject,
  topicHierarchy,
  futureTopics,
}: SubmissionEvaluationRequest) {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastEvaluationRequest, setLastEvaluationRequest] = useState<SubmissionEvaluationRequest | null>(null);
  const [evaluationCache, setEvaluationCache] = useState<Map<string, SubmissionEvaluationResponse>>(new Map());

  const evaluateSubmission = useCallback(async (): Promise<AISubmissionResult> => {
    setIsEvaluating(true);
    
    try {
      // Create cache key for identical requests
      const requestKey = `${questionId}-${studentAnswer}-${JSON.stringify(subject || '')}-${JSON.stringify(topicHierarchy || '')}-${JSON.stringify(futureTopics || [])}`;
      
      // Check cache first
      if (evaluationCache.has(requestKey)) {
        console.log('[useAISubmission] Using cached evaluation result');
        const cachedResult = evaluationCache.get(requestKey)!;
        return {
          success: true,
          passed: cachedResult.verdict === 'Correct',
          verdict: cachedResult.verdict,
          feedback: cachedResult.feedback,
        rawResponse: cachedResult.rawResponse,
          userAnswer: studentAnswer,
          timeSpent: 0,
          isAIEvaluated: true,
          aiEvaluation: cachedResult,
        };
      }

      console.log('[useAISubmission] Evaluating submission:', {
        questionId,
        question: question?.substring(0, 100) + '...',
        expectedAnswer: expectedAnswer?.substring(0, 50) + '...',
        studentAnswer: studentAnswer?.substring(0, 100) + '...',
        subject,
        topicHierarchy,
        futureTopics,
      });

      // Call AI service
      const aiRequest: SubmissionEvaluationRequest = {
        questionId,
        question,
        expectedAnswer,
        studentAnswer,
        subject,
        topicHierarchy,
        futureTopics,
      };

      const result = await aiService.evaluateSubmission(aiRequest);
      
      // Cache the result
      setEvaluationCache(prev => new Map(prev).set(requestKey, result));
      setLastEvaluationRequest(aiRequest);
      
      return {
        success: true,
        passed: result.verdict === 'Correct',
        verdict: result.verdict,
        feedback: result.feedback,
        rawResponse: result.rawResponse,
        userAnswer: studentAnswer,
        timeSpent: 0,
        isAIEvaluated: true,
        aiEvaluation: result,
      };
    } catch (error) {
      console.error('[useAISubmission] Evaluation failed:', error);
      
      // Return fallback result
      return {
        success: false,
        passed: false,
        verdict: 'Incorrect',
        feedback: 'Evaluation service unavailable. Please try again.',
        rawResponse: error instanceof Error ? error.message : String(error),
        userAnswer: studentAnswer,
        timeSpent: 0,
        isAIEvaluated: true,
        aiEvaluation: null,
      };
    } finally {
      setIsEvaluating(false);
    }
  }, [
    questionId,
    question,
    expectedAnswer,
    studentAnswer,
    subject,
    topicHierarchy,
    futureTopics,
    evaluationCache,
  ]);

  const clearCache = useCallback(() => {
    setEvaluationCache(new Map());
    setLastEvaluationRequest(null);
  }, []);

  return {
    evaluateSubmission,
    isEvaluating,
    lastEvaluationRequest,
    clearCache,
  };
}
