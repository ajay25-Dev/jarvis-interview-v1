"use client";
import { PythonPracticeInterface } from "./python-practice-interface";
import { SqlPracticeInterface } from "./sql-practice-interface";
import { PracticeCodingInterface } from "./practice-coding-interface";
import { PracticeInterfaceRouterProps } from "./types";

export function PracticeInterfaceRouter({
  exerciseId,
  questionId,
  initialCode = "",
  title,
  description,
  subjectType = 'python',
  language = 'python',
  onSubmit
}: PracticeInterfaceRouterProps) {
  const effectiveLanguage = language || subjectType;
  const normalizedLanguage = (effectiveLanguage ?? '').toLowerCase();
  const normalizedSubjectType = (subjectType ?? '').toLowerCase();
  
  const useSqlInterface =
    normalizedLanguage === 'sql' || normalizedSubjectType === 'sql';
  const usePythonInterface =
    normalizedLanguage === 'python' ||
    normalizedSubjectType === 'python' ||
    normalizedSubjectType === 'statistics';

  if (useSqlInterface) {
    return (
      <SqlPracticeInterface
        exerciseId={exerciseId}
        questionId={questionId}
        initialCode={initialCode}
        title={title}
        description={description}
        onSubmit={onSubmit}
      />
    );
  }

  if (usePythonInterface) {
    return (
      <PythonPracticeInterface
        exerciseId={exerciseId}
        questionId={questionId}
        initialCode={initialCode}
        title={title}
        description={description}
        subjectType={
          normalizedSubjectType === 'statistics' ? 'statistics' : 'python'
        }
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <PracticeCodingInterface
      exerciseId={exerciseId}
      questionId={questionId}
      initialCode={initialCode}
      title={title}
      description={description}
      subjectType={subjectType}
      onSubmit={onSubmit}
    />
  );
}
