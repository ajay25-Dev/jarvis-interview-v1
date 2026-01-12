import {
  SubmissionEvaluationRequest,
  SubmissionEvaluationResponse,
  HintRequest,
  HintResponse,
} from '@/components/practice/types';

// API configuration
const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';

// Error types
class AIServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public status?: string,
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.statusCode = statusCode;
    this.status = status;
  }
}

class AIService {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor() {
    this.baseUrl = AI_SERVICE_URL;
    this.apiKey = OPENAI_API_KEY;
    this.timeout = 30000; // 30 seconds
  }

  // Submission evaluation
  async evaluateSubmission(request: SubmissionEvaluationRequest): Promise<SubmissionEvaluationResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      console.log('[AI Service] Evaluating submission:', {
        question: request.question?.substring(0, 100) + '...',
        expectedAnswer: request.expectedAnswer?.substring(0, 50) + '...',
        studentAnswer: request.studentAnswer?.substring(0, 100) + '...',
        subject: request.subject,
        topicHierarchy: request.topicHierarchy,
        futureTopics: request.futureTopics,
      });

      const response = await fetch(`${this.baseUrl}/submission/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          question: request.question,
          expected_answer: request.expectedAnswer,
          student_answer: request.studentAnswer,
          subject: request.subject,
          topic_hierarchy: request.topicHierarchy,
          future_topics: request.futureTopics,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new AIServiceError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      console.log('[AI Service] Evaluation result:', {
        verdict: data.verdict,
        feedback: data.feedback,
      });

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AIServiceError('Request timed out', 408);
      }

      console.error('[AI Service] Evaluation error:', error);
      throw new AIServiceError('Failed to evaluate submission', 500);
    }
  }

  // Hint generation
  async generateHint(request: HintRequest): Promise<HintResponse | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      console.log('[AI Service] Generating hint:', {
        question: request.question?.substring(0, 100) + '...',
        studentAnswer: request.studentAnswer?.substring(0, 100) + '...',
        currentCode: request.currentCode?.substring(0, 200) + '...',
        datasetContext: request.datasetContext?.substring(0, 500) + '...',
      });

      const response = await fetch(`${this.baseUrl}/submission/hints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          question: request.question,
          expected_answer: request.expectedAnswer,
          student_answer: request.studentAnswer,
          subject: request.subject,
          topic_hierarchy: request.topicHierarchy,
          future_topics: request.futureTopics,
          current_code: request.currentCode,
          dataset_context: request.datasetContext,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('[AI Service] Hint generation failed:', response.status);
        return null; // Return null on failure to allow fallback
      }

      const data = await response.json();
      console.log('[AI Service] Hint result:', {
        verdict: data.verdict,
        message: data.message,
      });

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[AI Service] Hint request timed out');
        return null;
      }

      console.error('[AI Service] Hint generation error:', error);
      return null; // Return null on failure to allow fallback
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
