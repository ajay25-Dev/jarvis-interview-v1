"use client";

import { useState, useEffect } from "react";
import {
  PracticeCodingInterfaceProps,
  ExecutionResult,
  Dataset,
  Question,
  PracticeQuestionType,
} from "./types";
import { PracticeArea } from "./practice-area";

export function PracticeCodingInterface({
  exerciseId,
  questionId,
  initialCode = "",
  title,
  description,
  subjectType = 'python',
  onSubmit
}: PracticeCodingInterfaceProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDatasets = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/interview-prep/practice-exercises/${exerciseId}/datasets/${questionId}`
        );
        if (response.ok) {
          const data = await response.json();
          setDatasets(Array.isArray(data.datasets) ? data.datasets : []);
        }
      } catch (error) {
        console.error('Failed to load datasets:', error);
        setDatasets([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (questionId) {
      loadDatasets();
    }
  }, [questionId, exerciseId]);

  const handleSubmit = async (qId: string, solution: string): Promise<ExecutionResult> => {
    const response = await fetch(
      `/api/interview-prep/exercises/${exerciseId}/questions/${qId}/submit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: solution,
          language: subjectType
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to submit solution');
    }

    const result = await response.json();
    if (onSubmit) {
      onSubmit(result);
    }
    return result;
  };

  const handleRequestHint = async (
    qId: string,
    solution: string,
    extras?: {
      question?: string;
      datasetContext?: string;
      expectedAnswer?: string;
    },
  ) => {
    try {
      const response = await fetch(
        `/api/interview-prep/exercises/${exerciseId}/questions/${qId}/hint`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_code: solution,
            ...extras,
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        return {
          success: result.success ?? true,
          message: result.message || result.hint || 'No hint available',
          hint: result.hint,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get hint:', error);
      return null;
    }
  };

  const question: Question = {
    id: questionId,
    exercise_id: exerciseId,
    text: description,
    type: (subjectType as PracticeQuestionType) || 'python',
    order_index: 0,
    starter_code: initialCode,
    question_number: 0,
    // Add other required fields with defaults
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <PracticeArea
      questions={[question]}
      datasets={datasets}
      exerciseType={(subjectType as PracticeQuestionType) || 'python'}
      exerciseTitle={title}
      exerciseId={exerciseId}
      onSubmit={handleSubmit}
      onRequestHint={handleRequestHint}
    />
  );
}
