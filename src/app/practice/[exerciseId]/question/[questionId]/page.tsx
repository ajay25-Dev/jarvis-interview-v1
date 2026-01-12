'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Loader,
  AlertCircle,
} from 'lucide-react';
import { PracticeArea } from '@/components/practice/practice-area';
import { JsonObject, PracticeQuestionType, Dataset, Question as PracticeQuestion, ExecutionResult, TestCase, HintRequest } from '@/components/practice/types';
import { PracticeProvider, usePracticeContext } from '@/contexts/PracticeContext';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useCodeExecution } from '@/hooks/useCodeExecution';
import { useHint } from '@/hooks/useHint';

interface Question {
  id: string;
  text: string;
  type?: string;
  language?: string;
  difficulty?: string;
  topics?: string[];
  points?: number;
  order_index?: number;
  hint?: string;
  explanation?: string;
  starter_code?: string;
  expected_output_table?: string[];
  expected_answer?: string;
  sample_output?: string;
  case_study_context?: string;
  business_context?: string;
  content?: JsonObject;
  question_number?: number;
}

interface Exercise {
  id: string;
  subject: string;
  title?: string;
  description?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  type?: string;
  questions?: Question[];
  questions_raw?: Question[];
  dataset_description?: string;
  datasets?: Dataset[];
  data_creation_sql?: string;
  business_context?: string;
  created_at?: string;
}

type RawDataset = Dataset & { data?: string | JsonObject[] };

function PracticeWorkspaceContent() {
  const router = useRouter();
  const params = useParams();
  const exerciseId = params.exerciseId as string;
  const questionId = params.questionId as string;

  const {
    setCurrentQuestion,
    setCode,
    setLanguage,
    setExecutionResults,
    setResultsExpanded,
    code,
    language,
  } = usePracticeContext();

  const { submitCode } = useCodeExecution();
  const { requestHint } = useHint();

  useAutoSave({ enabled: true });

  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [error, setError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/interview-prep/practice-exercises`);
        if (!response.ok) {
          throw new Error('Failed to fetch exercises');
        }
        const data = await response.json();
        const allExercises: Exercise[] = Array.isArray(data) ? data : [];
        const found = allExercises.find((ex) => ex.id === exerciseId);
        if (!found) {
          throw new Error('Exercise not found');
        }

        const questions = [...(found.questions || found.questions_raw || [])].sort((a, b) => {
          const aIdx = a.order_index ?? 0;
          const bIdx = b.order_index ?? 0;
          return aIdx - bIdx;
        });

        const foundQuestion = questions.find((q) => q.id === questionId);
        if (!foundQuestion) {
          throw new Error('Question not found');
        }

        setExercise(found);
        setQuestion(foundQuestion);

        const index = questions.findIndex((q) => q.id === questionId);
        setCurrentQuestionIndex(index >= 0 ? index : 0);
        setCurrentQuestion(exerciseId, questionId, index >= 0 ? index : 0, questions.length);
        setLanguage(foundQuestion.language || 'sql');
        setCode(foundQuestion.starter_code || '');

        if (found.datasets && Array.isArray(found.datasets)) {
          const parsedDatasets = (found.datasets as RawDataset[]).map((ds) => {
            if (typeof ds.data === 'string') {
              try {
                const trimmed = ds.data.trim();
                if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                  return { ...ds, data: JSON.parse(trimmed) as JsonObject[] };
                }
                console.warn('Dataset data is not a valid JSON structure:', ds.data.substring(0, 100));
                return { ...ds, data: [] };
              } catch (e) {
                console.warn('Failed to parse dataset data:', e);
                return { ...ds, data: [] };
              }
            }
            return ds;
          });
          setDatasets(parsedDatasets);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load exercise or question.');
      } finally {
        setLoading(false);
      }
    };

    if (exerciseId && questionId) {
      fetchData();
    }
  }, [exerciseId, questionId, setCurrentQuestion, setLanguage, setCode]);

  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);

  useEffect(() => {
    if (!questionId) return;
    setTimeSpentSeconds(0);
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        setTimeSpentSeconds((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [questionId]);

  const questionList = useMemo(() => {
    if (!exercise) return [];
    return [...(exercise.questions || exercise.questions_raw || [])].sort((a, b) => {
      const aIdx = a.order_index ?? 0;
      const bIdx = b.order_index ?? 0;
      return aIdx - bIdx;
    });
  }, [exercise]);

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevQuestion = questionList[currentQuestionIndex - 1];
      if (prevQuestion) {
        router.push(`/practice/${exerciseId}/question/${prevQuestion.id}`);
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questionList.length - 1) {
      const nextQuestion = questionList[currentQuestionIndex + 1];
      if (nextQuestion) {
        router.push(`/practice/${exerciseId}/question/${nextQuestion.id}`);
      }
    }
  };

  const handleSubmitWrapper = async (qId: string, solution: string): Promise<ExecutionResult> => {
    setCode(solution);
    const result = await submitCode([], datasets);
    if (result) {
      setExecutionResults(result as ExecutionResult);
      setResultsExpanded(true);
      return result as ExecutionResult;
    }
    throw new Error('Submission failed');
  };

  const handleRequestHintWrapper = async (
    qId: string,
    solution: string,
    extras?: {
      question?: string;
      datasetContext?: string;
      expectedAnswer?: string;
    },
  ) => {
    setCode(solution);
    return await requestHint(extras);
  };

  const aiEvaluation = useCallback(
    async (request: { questionId?: string }) => {
      if (!exerciseId || !request?.questionId) {
        console.warn('[PracticeWorkspace] Missing IDs for AI evaluation');
        return null;
      }

      try {
        const response = await fetch(
          `/api/interview-prep/exercises/${exerciseId}/questions/${request.questionId}/submit`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              language,
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Evaluation API error: ${response.status} ${errorText}`,
          );
        }

        const data = await response.json();
        const verdict = data.passed ? 'Correct' : 'Incorrect';
        const feedback =
          (Array.isArray(data.test_results) && data.test_results.length > 0
            ? data.test_results
                .map(
                  (tc: TestCase) =>
                    `${tc.passed ? '✅' : '❌'} ${
                      tc.expected_output ?? tc.actual_output ?? ''
                    }`,
                )
                .join('\n')
            : `Score: ${data.score ?? 0}/${data.total_points ?? 0}`) ||
          'Execution completed.';

        const aiPayload = {
          verdict,
          feedback,
          rawResponse: JSON.stringify(data),
        };

        return {
          success: true,
          passed: data.passed,
          verdict,
          feedback,
          rawResponse: JSON.stringify(data),
          userAnswer: code,
          timeSpent: data.overall_result?.execution_time ?? 0,
          isAIEvaluated: true,
          aiEvaluation: aiPayload,
        };
        console.log("dfdf",verdict);
      } catch (error) {
        console.error('[PracticeWorkspace] AI evaluation failed:', error);
        return null;
      }
    },
    [code, exerciseId, language],
  );

  const aiHint = useCallback(
    async (request: HintRequest) => {
      if (!exerciseId || !request?.questionId) {
        console.warn('[PracticeWorkspace] Missing IDs for AI hint');
        return null;
      }

      console.log("Checking response");

      console.log({
              current_code: request.currentCode ?? request.studentAnswer ?? code,
              question: request.question,
              expected_answer: request.expectedAnswer,
              dataset_context: request.datasetContext,
              subject: request.subject,
              topicHierarchy: request.topicHierarchy,
              futureTopics: request.futureTopics,
              hint_level: request.hintLevel,
            });

      try {
        const response = await fetch(
          `/api/interview-prep/exercises/${exerciseId}/questions/${request.questionId}/hint`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              current_code: request.currentCode ?? request.studentAnswer ?? code,
              question: request.question,
              expected_answer: request.expectedAnswer,
              dataset_context: request.datasetContext,
              subject: request.subject,
              topicHierarchy: request.topicHierarchy,
              futureTopics: request.futureTopics,
              hint_level: request.hintLevel,
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Hint API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const message = data.hint ?? data.message ?? 'Hint not available.';
        const validHintLevels = ['basic', 'detailed', 'partial'] as const;
        const requestedLevel = request.hintLevel ?? 'basic';
        const normalizedHintLevel =
          data.hintLevel && validHintLevels.includes(data.hintLevel)
            ? data.hintLevel
            : validHintLevels.includes(requestedLevel)
              ? requestedLevel
              : 'basic';

        const verdict =
          data.verdict ??
          (typeof data.success === 'boolean'
            ? data.success
              ? 'Hint'
              : 'Unavailable'
            : 'Hint');

        return {
          verdict,
          message,
          hintLevel: normalizedHintLevel,
          hintCount: data.hintCount ?? 1,
          rawResponse: JSON.stringify(data),
        };
      } catch (error) {
        console.error('[PracticeWorkspace] AI hint failed:', error);
        return null;
      }
    },
    [code, exerciseId],
  );

  const mappedQuestions: PracticeQuestion[] = useMemo(() => {
    return questionList.map(q => ({
      id: q.id,
      exercise_id: exerciseId,
      text: q.text,
      type: (q.type as PracticeQuestionType) || 'python',
      order_index: q.order_index || 0,
      starter_code: q.starter_code,
      hint: q.hint,
      explanation: q.explanation,
      points: q.points,
      difficulty: q.difficulty,
      topics: q.topics,
      question_number: q.question_number ?? q.order_index ?? 0,
      // Add other required fields with defaults
      language: q.language,
      case_study_context: q.case_study_context,
      business_context: q.business_context,
      content: q.content,
    }));
  }, [questionList, exerciseId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading practice workspace...</p>
        </div>
      </div>
    );
  }

  if (!exercise || !question || error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-lg font-semibold text-gray-900">Practice Workspace</span>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Error Loading Workspace</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Navigation Bar */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50 flex-shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-semibold text-gray-900 truncate">
                  {exercise.title || exercise.subject}
                </h1>
                <p className="text-xs text-gray-500">Question {currentQuestionIndex + 1} of {mappedQuestions.length}</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-hidden">
        <PracticeArea
          questions={mappedQuestions}
          datasets={datasets}
          exerciseType={(question.type as PracticeQuestionType) || 'python'}
          exerciseTitle={exercise.title || exercise.subject}
          exerciseDifficulty={exercise.difficulty}
          exerciseId={exerciseId}
          activeQuestionIndex={currentQuestionIndex}
          onSubmit={handleSubmitWrapper}
          onRequestHint={handleRequestHintWrapper}
          onNext={handleNextQuestion}
          onPrevious={handlePreviousQuestion}
          onCodeChange={setCode}
          aiEvaluation={aiEvaluation}
          aiHint={aiHint}
          datasetDescription={exercise.dataset_description}
          businessContext={exercise.business_context}
          dataCreationSql={exercise.data_creation_sql}
          timeSpent={timeSpentSeconds}
        />
      </div>
    </div>
  );
}

export default function PracticeWorkspacePage() {
  return (
    <PracticeProvider>
      <PracticeWorkspaceContent />
    </PracticeProvider>
  );
}
