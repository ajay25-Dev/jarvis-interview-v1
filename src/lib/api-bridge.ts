'use client';

import { Exercise, Question, Dataset, ExecutionResult, TestCase, JsonObject } from '@/components/practice/types';
import { apiPost } from '@/lib/api-client';

export interface ExerciseFilters {
  subject?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  page?: number;
  limit?: number;
}

export interface ExerciseDetail extends Exercise {
  created_at?: string;
  updated_at?: string;
}

export interface QuestionData extends Question {
  datasets: Dataset[];
  test_cases: TestCase[];
}

export interface DatasetPreview {
  id: string;
  name: string;
  columns: string[];
  preview: JsonObject[];
  record_count: number;
  schema_info?: unknown;
}

export interface SubmissionResult {
  success: boolean;
  passed: boolean;
  score: number;
  total_points: number;
  feedback?: string;
  test_results?: TestCase[];
  attempt_id?: string;
}

export interface HintResult {
  success: boolean;
  message: string;
  hint?: string;
}

export interface ChatMessage {
  role: 'user' | 'mentor';
  content: string;
  timestamp: string;
}

export interface ProgressData {
  question_id: string;
  code: string;
  language: string;
  execution_results?: ExecutionResult;
  submitted: boolean;
  timestamp: string;
}

export class PracticeExerciseAPI {
  private static baseUrl = '/api/interview-prep';

  static async getExercises(filters?: ExerciseFilters): Promise<Exercise[]> {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const url = `${this.baseUrl}/practice-exercises${params.size ? `?${params}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch exercises');
    return response.json();
  }

  static async getExerciseDetail(exerciseId: string): Promise<ExerciseDetail> {
    const response = await fetch(`${this.baseUrl}/practice-exercises/${exerciseId}`);
    if (!response.ok) throw new Error('Failed to fetch exercise details');
    return response.json();
  }

  static async getQuestionData(exerciseId: string, questionId: string): Promise<QuestionData> {
    const response = await fetch(
      `${this.baseUrl}/exercises/${exerciseId}/questions/${questionId}`
    );
    if (!response.ok) throw new Error('Failed to fetch question data');
    return response.json();
  }

  static async getDatasetPreview(exerciseId: string, datasetId: string): Promise<DatasetPreview> {
    const response = await fetch(
      `${this.baseUrl}/exercises/${exerciseId}/datasets/${datasetId}`
    );
    if (!response.ok) throw new Error('Failed to fetch dataset preview');
    return response.json();
  }

  static async executeCode(
    exerciseId: string,
    questionId: string,
    code: string,
    language: string,
    testCases?: TestCase[],
    datasets?: Dataset[],
  ): Promise<ExecutionResult> {
    const payload = {
      exercise_id: exerciseId,
      question_id: questionId,
      code,
      language,
      practice_type: 'interview',
      test_cases: testCases || [],
      datasets,
    };
    return apiPost<ExecutionResult>('/v1/practice-coding/execute', payload);
  }

  static async submitAnswer(
    exerciseId: string,
    questionId: string,
    code: string,
    language: string,
    testCases?: TestCase[],
    datasets?: Dataset[],
  ): Promise<SubmissionResult> {
    const payload = {
      exercise_id: exerciseId,
      question_id: questionId,
      code,
      language,
      practice_type: 'interview',
      test_cases: testCases || [],
      datasets,
    };
    return apiPost<SubmissionResult>('/v1/practice-coding/submit', payload);
  }

  static async requestHint(
    exerciseId: string,
    questionId: string,
    currentCode: string,
    extras?: {
      question?: string;
      datasetContext?: string;
      expectedAnswer?: string;
    },
  ): Promise<HintResult> {
    return apiPost<HintResult>(
      `/v1/sections/exercises/${exerciseId}/questions/${questionId}/hint`,
      { userAnswer: currentCode, ...extras },
    );
  }

  static async sendChatMessage(
    exerciseId: string,
    questionId: string,
    message: string
  ): Promise<ChatMessage> {
    return apiPost<ChatMessage>(
      `/v1/sections/exercises/${exerciseId}/questions/${questionId}/chat`,
      { message },
    );
  }

  static async saveProgress(
    exerciseId: string,
    questionId: string,
    progress: ProgressData,
  ): Promise<void> {
    const requestBody = { ...progress };
    requestBody.question_id = questionId;

    const response = await fetch(
      `${this.baseUrl}/exercises/${exerciseId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );
    if (!response.ok) throw new Error('Failed to save progress');
  }
}
