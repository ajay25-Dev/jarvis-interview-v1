import { PracticeAreaAIEnhanced } from './practice-area-ai-enhanced';
import {
  PracticeQuestionType,
  Dataset,
  Question,
  ExecutionResult,
  HintResult,
  PracticeAreaAIEvaluationHandler,
  PracticeAreaAIHintHandler,
} from './types';

export { PracticeAreaAIEnhanced as default } from './practice-area-ai-enhanced';

export type PracticeAreaProps = {
  questions: Question[];
  datasets: Dataset[];
  exerciseType: PracticeQuestionType;
  exerciseTitle?: string;
  exerciseDifficulty?: string | null;
  answersMap?: Record<string, string> | null;
  onSubmit?: (questionId: string, solution: string, timeSpent?: number) => Promise<ExecutionResult>;
  onRequestHint?: (questionId: string, solution: string) => Promise<HintResult | null>;
  onNext?: () => void;
  onPrevious?: () => void;
  onCodeChange?: (code: string) => void;
  exerciseId: string;
  datasetDescription?: string;
  activeQuestionIndex?: number;
  dataCreationSql?: string;
  timeSpent?: number;
  businessContext?: string;
  aiEvaluation?: PracticeAreaAIEvaluationHandler;
  aiHint?: PracticeAreaAIHintHandler;
};

export function PracticeArea({
  questions,
  datasets,
  exerciseType,
  exerciseTitle,
  exerciseDifficulty,
  datasetDescription,
  onRequestHint,
  onNext,
  onPrevious,
  onCodeChange,
  exerciseId,
  activeQuestionIndex,
  timeSpent,
  dataCreationSql,
  businessContext,
  aiEvaluation,
  aiHint,
}: PracticeAreaProps) {
  const aiProps = {
    questions,
    datasets,
    exerciseType,
    exerciseTitle: exerciseTitle || 'Practice Exercise (AI-Powered)',
    exerciseDifficulty,
    exerciseId,
    activeQuestionIndex,
    onCodeChange,
    onNext,
    onPrevious,
    aiEvaluation: aiEvaluation ?? undefined,
    aiHint: aiHint ?? undefined,
    onRequestHint,
    timeSpent: timeSpent ?? 0,
    datasetDescription,
    dataCreationSql,
    businessContext,
  };

  return <PracticeAreaAIEnhanced {...aiProps} />;
}
