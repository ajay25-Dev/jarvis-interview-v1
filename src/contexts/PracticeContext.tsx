import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ExecutionResult } from '@/components/practice/types';

export interface HintResult {
  success: boolean;
  message: string;
  hint?: string;
  timestamp: string;
}

export interface SubmissionResult {
  success: boolean;
  passed: boolean;
  score: number;
  total_points: number;
  feedback?: string;
  timestamp: string;
  attempt_id?: string;
}

export interface ChatMessage {
  role: 'user' | 'mentor';
  content: string;
  timestamp: string;
}

export interface ProgressData {
  exerciseId: string;
  questionId: string;
  code: string;
  language: string;
  lastModified: string;
  execution?: ExecutionResult;
  attempts: number;
  hints_used: number;
  submitted: boolean;
  submission?: SubmissionResult;
}

interface PracticeContextType {
  currentExerciseId: string;
  currentQuestionId: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  setCurrentQuestion: (exerciseId: string, questionId: string, index: number, total: number) => void;

  code: string;
  setCode: (code: string) => void;
  language: string;
  setLanguage: (language: string) => void;

  executionResults: ExecutionResult | null;
  setExecutionResults: (results: ExecutionResult | null) => void;

  hints: HintResult[];
  addHint: (hint: HintResult) => void;
  clearHints: () => void;

  submissions: SubmissionResult[];
  addSubmission: (submission: SubmissionResult) => void;

  mentorMessages: ChatMessage[];
  addMentorMessage: (message: ChatMessage) => void;
  clearMentorMessages: () => void;

  progress: ProgressData | null;
  saveProgress: () => Promise<void>;
  loadProgress: (exerciseId: string, questionId: string) => void;
  clearProgress: () => void;

  isSaving: boolean;
  lastSaved: string | null;

  mentorChatOpen: boolean;
  setMentorChatOpen: (open: boolean) => void;

  resultsExpanded: boolean;
  setResultsExpanded: (expanded: boolean) => void;

  resetQuestion: () => void;
}

const PracticeContext = createContext<PracticeContextType | undefined>(undefined);

const STORAGE_PREFIX = 'practice_exercise';

interface PracticeProviderProps {
  children: React.ReactNode;
}

export function PracticeProvider({ children }: PracticeProviderProps) {
  const [currentExerciseId, setCurrentExerciseId] = useState('');
  const [currentQuestionId, setCurrentQuestionId] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('sql');

  const [executionResults, setExecutionResults] = useState<ExecutionResult | null>(null);

  const [hints, setHints] = useState<HintResult[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionResult[]>([]);
  const [mentorMessages, setMentorMessages] = useState<ChatMessage[]>([]);

  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const [mentorChatOpen, setMentorChatOpen] = useState(false);
  const [resultsExpanded, setResultsExpanded] = useState(false);

  const storageKey = `${STORAGE_PREFIX}_${currentExerciseId}_q${currentQuestionId}`;

  const loadProgress = useCallback(
    (exerciseId: string, questionId: string) => {
      try {
        const key = `${STORAGE_PREFIX}_${exerciseId}_q${questionId}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const data = JSON.parse(stored) as ProgressData;
          setCode(data.code || '');
          setLanguage(data.language || 'sql');
          setProgress(data);

          if (data.execution) {
            setExecutionResults(data.execution);
          }
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    },
    []
  );

  const setCurrentQuestion = useCallback(
    (exerciseId: string, questionId: string, index: number, total: number) => {
      setCurrentExerciseId(exerciseId);
      setCurrentQuestionId(questionId);
      setCurrentQuestionIndex(index);
      setTotalQuestions(total);
      loadProgress(exerciseId, questionId);
    },
    [loadProgress]
  );

  const saveProgress = useCallback(async () => {
    if (!currentExerciseId || !currentQuestionId) return;

    try {
      setIsSaving(true);

      const progressData: ProgressData = {
        exerciseId: currentExerciseId,
        questionId: currentQuestionId,
        code,
        language,
        lastModified: new Date().toISOString(),
        execution: executionResults || undefined,
        attempts: progress?.attempts || 0,
        hints_used: hints.length,
        submitted: submissions.length > 0,
        submission: submissions[submissions.length - 1],
      };

      localStorage.setItem(storageKey, JSON.stringify(progressData));
      setProgress(progressData);
      setLastSaved(new Date().toISOString());

      try {
        await fetch(`/api/interview-prep/exercises/${currentExerciseId}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_id: currentQuestionId,
            ...progressData,
          }),
        });
      } catch (error) {
        console.warn('Failed to sync progress to server:', error);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsSaving(false);
    }
  }, [
    currentExerciseId,
    currentQuestionId,
    code,
    language,
    executionResults,
    progress,
    hints.length,
    submissions,
    storageKey,
  ]);

  const clearProgress = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    setCode('');
    setLanguage('sql');
    setProgress(null);
    setExecutionResults(null);
    setHints([]);
    setSubmissions([]);
    setMentorMessages([]);
  }, [storageKey]);

  const addHint = useCallback((hint: HintResult) => {
    setHints((prev) => [...prev, { ...hint, timestamp: new Date().toISOString() }]);
  }, []);

  const clearHints = useCallback(() => {
    setHints([]);
  }, []);

  const addSubmission = useCallback((submission: SubmissionResult) => {
    setSubmissions((prev) => [
      ...prev,
      { ...submission, timestamp: new Date().toISOString() },
    ]);
  }, []);

  const addMentorMessage = useCallback((message: ChatMessage) => {
    setMentorMessages((prev) => [...prev, message]);
  }, []);

  const clearMentorMessages = useCallback(() => {
    setMentorMessages([]);
  }, []);

  const resetQuestion = useCallback(() => {
    setCode('');
    setExecutionResults(null);
    setHints([]);
    clearMentorMessages();
  }, [clearMentorMessages]);

  useEffect(() => {
    const timer = setInterval(saveProgress, 30000);
    return () => clearInterval(timer);
  }, [saveProgress]);

  const value: PracticeContextType = {
    currentExerciseId,
    currentQuestionId,
    currentQuestionIndex,
    totalQuestions,
    setCurrentQuestion,

    code,
    setCode,
    language,
    setLanguage,

    executionResults,
    setExecutionResults,

    hints,
    addHint,
    clearHints,

    submissions,
    addSubmission,

    mentorMessages,
    addMentorMessage,
    clearMentorMessages,

    progress,
    saveProgress,
    loadProgress,
    clearProgress,

    isSaving,
    lastSaved,

    mentorChatOpen,
    setMentorChatOpen,

    resultsExpanded,
    setResultsExpanded,

    resetQuestion,
  };

  return <PracticeContext.Provider value={value}>{children}</PracticeContext.Provider>;
}

export function usePracticeContext() {
  const context = useContext(PracticeContext);
  if (!context) {
    throw new Error('usePracticeContext must be used within PracticeProvider');
  }
  return context;
}
