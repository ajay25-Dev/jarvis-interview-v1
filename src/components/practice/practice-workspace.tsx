'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, MessageCircle, X } from 'lucide-react';
import { CodeEditor } from './code-editor';
import { DatasetViewer } from './dataset-viewer';
import { ExecutionResult, Dataset, Question } from './types';
import { SubmissionResults } from './submission-results';

interface WorkspaceHeader {
  exerciseTitle: string;
  currentQuestionNumber: number;
  totalQuestions: number;
  isSaving?: boolean;
  lastSaved?: string;
}

interface PracticeWorkspaceProps {
  header: WorkspaceHeader;
  question: Question;
  code: string;
  language: 'sql' | 'python' | 'javascript' | 'java' | 'cpp' | 'csharp';
  datasets: Dataset[];
  executionResult: ExecutionResult | null;
  isRunning?: boolean;
  isSubmitting?: boolean;
  isResultsExpanded?: boolean;
  showMentorChat?: boolean;
  onCodeChange: (code: string) => void;
  onRun?: () => void;
  onSubmit?: () => void;
  onToggleResults?: () => void;
  onToggleMentorChat?: () => void;
}

export function PracticeWorkspace({
  header,
  question,
  code,
  language,
  datasets,
  executionResult,
  isRunning = false,
  isSubmitting = false,
  isResultsExpanded = false,
  showMentorChat = false,
  onCodeChange,
  onRun,
  onSubmit,
  onToggleResults,
  onToggleMentorChat,
}: PracticeWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'problem' | 'datasets'>('problem');

  return (
    <div className="flex h-full bg-gray-50 gap-4">
      {/* Left Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="border-b bg-white px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('problem')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'problem'
                  ? 'text-primary border-primary'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Problem
            </button>
            {datasets.length > 0 && (
              <button
                onClick={() => setActiveTab('datasets')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'datasets'
                    ? 'text-primary border-primary'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                Datasets ({datasets.length})
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'problem' ? (
            <div className="h-full overflow-y-auto p-4">
              <Card className="p-4">
                <div className="space-y-4">
                  {/* Question Metadata */}
                  <div className="pb-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">
                      Question {header.currentQuestionNumber} of {header.totalQuestions}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {question.difficulty && (
                        <span className="text-sm px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                          {question.difficulty}
                        </span>
                      )}
                      {question.type && (
                        <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                          {question.type}
                        </span>
                      )}
                      {question.points && (
                        <span className="text-sm px-3 py-1 bg-green-100 text-green-800 rounded-full">
                          {question.points} points
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Problem Text */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Problem</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{question.text}</p>
                  </div>

                  {/* Topics */}
                  {question.topics && question.topics.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Topics</h4>
                      <div className="flex flex-wrap gap-2">
                        {question.topics.map((topic) => (
                          <span
                            key={topic}
                            className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hint */}
                  {question.hint && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">Hint</h4>
                      <p className="text-sm text-blue-800">{question.hint}</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4">
              <DatasetViewer datasets={datasets} />
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Editor & Results */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Code Editor */}
        <div className="flex-1 overflow-hidden mb-4">
          <CodeEditor
            code={code}
            language={language}
            onChange={onCodeChange}
            onRun={onRun}
            onSubmit={onSubmit}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            title={`Write your ${language.toUpperCase()} code`}
          />
        </div>

        {/* Results */}
        {executionResult && (
          <div className="flex-1 overflow-hidden mb-4">
            <SubmissionResults
              result={executionResult}
              isExpanded={isResultsExpanded}
              onToggleExpanded={onToggleResults || (() => {})}
            />
          </div>
        )}
      </div>

      {/* Mentor Chat Panel */}
      {showMentorChat && (
        <div className="w-80 flex flex-col overflow-hidden border-l">
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Mentor Chat</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMentorChat}
              className="h-8 px-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <p className="text-sm text-gray-600 text-center">Mentor chat content here</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface WorkspaceHeaderProps {
  exerciseTitle: string;
  questionNumber: number;
  totalQuestions: number;
  isSaving?: boolean;
  lastSaved?: string;
  onBack?: () => void;
}

export function WorkspaceHeaderComponent({
  exerciseTitle,
  questionNumber,
  totalQuestions,
  isSaving = false,
  lastSaved,
  onBack,
}: WorkspaceHeaderProps) {
  return (
    <div className="border-b bg-white">
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-gray-900 truncate">
              {exerciseTitle}
            </h1>
            <p className="text-xs text-gray-500">
              Question {questionNumber} of {totalQuestions}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          {isSaving && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              Saving...
            </div>
          )}
          {lastSaved && !isSaving && (
            <div className="text-xs text-gray-500">Last saved: {lastSaved}</div>
          )}
        </div>
      </div>
    </div>
  );
}
