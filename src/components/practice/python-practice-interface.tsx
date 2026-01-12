"use client";

import { useState, useEffect, useRef } from "react";
import { usePyodide } from "@/hooks/use-pyodide";
import { toast } from "sonner";
import {
  PlayCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Code,
  Database,
  Loader,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PythonPracticeInterfaceProps, ExecutionResult, Dataset } from "./types";

const DEFAULT_PYTHON_TEMPLATE = `# Python Practice Exercise
# Write your Python code below

# You can use pandas for data analysis
# import pandas as pd

# Your solution here
def solution():
    # Your code goes here
    pass

# Test your solution
if __name__ == "__main__":
    solution()
`;

export function PythonPracticeInterface({
  exerciseId,
  questionId,
  initialCode = "",
  title,
  description,
  onSubmit
}: PythonPracticeInterfaceProps) {
  const [code, setCode] = useState<string>(initialCode || DEFAULT_PYTHON_TEMPLATE);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<string>('');
  const [executionError, setExecutionError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'editor' | 'results' | 'dataset'>('editor');

  const editorRef = useRef<HTMLTextAreaElement>(null);

  const { isReady, isLoading, error, initialize, executeCode } = usePyodide({ autoInit: true });

  useEffect(() => {
    const loadDatasets = async () => {
      try {
        const response = await fetch(`/api/interview-prep/practice-exercises/${exerciseId}/datasets/${questionId}`);
        if (response.ok) {
          const data = await response.json();
          setDatasets(Array.isArray(data.datasets) ? data.datasets : []);
        }
      } catch (error) {
        console.error('Failed to load datasets:', error);
        setDatasets([]);
      }
    };

    if (questionId) {
      loadDatasets();
    }
  }, [questionId, exerciseId]);

  const handleExecute = async () => {
    if (!code.trim()) {
      toast.error('Please enter Python code');
      return;
    }

    if (!isReady) {
      toast.error('Python runtime not ready');
      return;
    }

    setIsExecuting(true);
    setExecutionError('');
    setExecutionResult('');

    try {
      const result = await executeCode(code);
      if (result.success) {
        setExecutionResult(result.output || '');
        setActiveTab('results');
        toast.success('Code executed successfully');
      } else {
        setExecutionError(result.error || 'Unknown error');
        setActiveTab('results');
        toast.error('Code execution failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setExecutionError(errorMessage);
      setActiveTab('results');
      toast.error('Execution error');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result: ExecutionResult = {
        success: !executionError,
        passed: !executionError,
        score: executionError ? 0 : 100,
        total_points: 100,
        test_results: [],
        overall_result: {
          stdout: executionResult,
          stderr: executionError,
          execution_time: 0,
          memory_used: 0,
          exit_code: executionError ? 1 : 0
        }
      };

      if (onSubmit) {
        onSubmit(result);
      }
      toast.success('Solution submitted');
    } catch (error) {
      console.error('Failed to submit solution:', error);
      toast.error('Failed to submit solution');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Initializing Python runtime...</p>
          <p className="text-xs text-gray-500 mt-2">This may take a moment on first load</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Runtime Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 mb-4">{error}</p>
            <Button onClick={initialize} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'editor'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Code className="w-4 h-4 inline mr-2" />
            Editor
          </button>
          {datasets.length > 0 && (
            <button
              onClick={() => setActiveTab('dataset')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'dataset'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Database className="w-4 h-4 inline mr-2" />
              Dataset
            </button>
          )}
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'results'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CheckCircle className="w-4 h-4 inline mr-2" />
            Results
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'editor' && (
            <div className="p-4 h-full flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
              <textarea
                ref={editorRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="# Write your Python code here..."
                className="flex-1 w-full p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {activeTab === 'dataset' && (
            <div className="p-4">
              {datasets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No datasets available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {datasets.map((dataset) => (
                    <Card key={dataset.id}>
                      <CardHeader>
                        <CardTitle className="text-sm">{dataset.name}</CardTitle>
                        <CardDescription>{dataset.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Columns:</h4>
                          <div className="flex flex-wrap gap-2">
                            {dataset.columns?.map((col) => (
                              <Badge key={col} variant="secondary">{col}</Badge>
                            ))}
                          </div>
                        </div>
                        {dataset.data && dataset.data.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Sample Data:</h4>
                            <div className="overflow-x-auto">
                              <table className="text-xs border-collapse w-full">
                                <thead>
                                  <tr className="bg-gray-100">
                                    {dataset.columns?.map((col) => (
                                      <th key={col} className="border border-gray-300 px-2 py-1 text-left">
                                        {col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {dataset.data.slice(0, 5).map((row, idx) => (
                                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      {dataset.columns?.map((col) => (
                                        <td key={col} className="border border-gray-300 px-2 py-1">
                                          {String(row[col] ?? '')}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {dataset.data.length > 5 && (
                              <p className="text-xs text-gray-500 mt-2">
                                Showing 5 of {dataset.data.length} rows
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'results' && (
            <div className="p-4">
              {executionError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-900">Error</h4>
                      <pre className="text-xs text-red-800 mt-1 overflow-auto max-h-40">
                        {executionError}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
              {executionResult && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Output:</h4>
                  <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-auto max-h-96">
                    <pre>{executionResult}</pre>
                  </div>
                </div>
              )}
              {!executionResult && !executionError && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No results yet. Click &quot;Run&quot; to execute your code.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-gray-200 bg-gray-50 p-4 flex gap-2">
        <Button
          onClick={handleExecute}
          disabled={isExecuting || !isReady}
          className="gap-2"
        >
          {isExecuting ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <PlayCircle className="w-4 h-4" />
          )}
          {isExecuting ? 'Running...' : 'Run'}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !isReady}
          variant="default"
          className="gap-2"
        >
          {isSubmitting ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Submit
        </Button>
        <Button
          onClick={() => setCode(DEFAULT_PYTHON_TEMPLATE)}
          variant="outline"
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
