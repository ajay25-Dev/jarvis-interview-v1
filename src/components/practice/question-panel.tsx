'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  BookOpen,
  Zap,
  Info,
  CheckCircle2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Question } from './types';

interface QuestionPanelProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  onNavigate: (direction: 'prev' | 'next') => void;
  onRequestHint?: () => void;
  hintLoading?: boolean;
}

export function QuestionPanel({
  question,
  currentIndex,
  totalQuestions,
  onNavigate,
  onRequestHint,
  hintLoading = false,
}: QuestionPanelProps) {
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const getDifficultyColor = (difficulty?: string) => {
    if (!difficulty) return 'bg-gray-100 text-gray-800';
    const lower = difficulty.toLowerCase();
    if (lower.includes('beginner') || lower.includes('easy')) return 'bg-green-100 text-green-800';
    if (lower.includes('intermediate') || lower.includes('medium')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg mb-2">
              Question {currentIndex + 1} of {totalQuestions}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {question.difficulty && (
                <Badge className={getDifficultyColor(question.difficulty)}>
                  {question.difficulty}
                </Badge>
              )}
              {question.type && (
                <Badge variant="secondary" className="text-xs">
                  {question.type.toUpperCase()}
                </Badge>
              )}
              {question.points && (
                <Badge variant="outline" className="text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  {question.points} pts
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="flex-1 overflow-y-auto pb-4 space-y-4">
        {/* Problem Statement */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Problem Statement
          </h3>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="text-sm text-gray-700 leading-relaxed mb-2">{children}</p>,
                li: ({ children }) => <li className="text-sm text-gray-700 ml-4 mb-1">{children}</li>,
                ul: ({ children }) => <ul className="list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal">{children}</ol>,
                code: ({ children }) => (
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-red-600">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mb-2">
                    {children}
                  </pre>
                ),
              }}
            >
              {question.text}
            </ReactMarkdown>
          </div>
        </div>

        {/* Topics */}
        {question.topics && question.topics.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Topics</h4>
            <div className="flex flex-wrap gap-2">
              {question.topics.map((topic) => (
                <Badge key={topic} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Expected Output */}
        {question.expected_output_table && (
          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Expected Output
            </h4>
            <div className="text-xs bg-blue-50 border border-blue-200 p-3 rounded text-gray-700">
              <p className="font-mono">
                Columns: <span className="font-bold">{question.expected_output_table.join(', ')}</span>
              </p>
            </div>
          </div>
        )}

        {/* Hint Section */}
        {question.hint && (
          <div className="border-t pt-3">
            <button
              onClick={() => {
                if (!showHint && onRequestHint) {
                  onRequestHint();
                }
                setShowHint(!showHint);
              }}
              disabled={hintLoading}
              className="flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-50"
            >
              <Lightbulb className="w-4 h-4" />
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </button>
            {showHint && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900">
                {hintLoading ? (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="animate-spin w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full" />
                    Generating hint...
                  </div>
                ) : (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-1">{children}</p>,
                      code: ({ children }) => (
                        <code className="bg-amber-100 px-1 rounded text-xs font-mono">
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {question.hint}
                  </ReactMarkdown>
                )}
              </div>
            )}
          </div>
        )}

        {/* Explanation Section */}
        {question.explanation && (
          <div className="border-t pt-3">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
            </button>
            {showExplanation && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-1">{children}</p>,
                    code: ({ children }) => (
                      <code className="bg-blue-100 px-1 rounded text-xs font-mono">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {question.explanation}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Navigation Buttons */}
      <div className="border-t p-3 flex gap-2 bg-gray-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('prev')}
          disabled={isFirstQuestion}
          className="flex-1"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('next')}
          disabled={isLastQuestion}
          className="flex-1"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
