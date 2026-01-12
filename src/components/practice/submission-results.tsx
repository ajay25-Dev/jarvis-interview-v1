import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ExecutionResult } from './types';

interface SubmissionResultsProps {
  result: ExecutionResult | null;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function SubmissionResults({
  result,
  isExpanded,
  onToggleExpanded,
}: SubmissionResultsProps) {
  if (!result) return null;

  const successColor = result.success
    ? 'bg-green-50 border-green-200'
    : 'bg-red-50 border-red-200';

  const statusIcon = result.success ? (
    <CheckCircle2 className="w-5 h-5 text-green-600" />
  ) : (
    <XCircle className="w-5 h-5 text-red-600" />
  );

  const statusText = result.success ? 'Success' : 'Failed';
  const statusColor2 = result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

  return (
    <Card className={`${successColor} border-2`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {statusIcon}
            <div>
              <CardTitle className="text-base">{statusText}</CardTitle>
              {result.passed && (
                <p className="text-sm text-green-600 font-medium">All tests passed!</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="h-auto p-2"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="bg-white rounded p-2">
            <p className="text-gray-600 text-xs">Score</p>
            <p className="text-lg font-bold">
              {result.score}/{result.total_points}
            </p>
          </div>
          <div className="bg-white rounded p-2">
            <p className="text-gray-600 text-xs">Status</p>
            <Badge className={statusColor2}>{statusText}</Badge>
          </div>
          <div className="bg-white rounded p-2">
            <p className="text-gray-600 text-xs">Execution</p>
            <p className="text-sm font-semibold">
              {result.overall_result?.execution_time || 0}ms
            </p>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-4 pt-2 border-t border-opacity-50">
            {/* Test Results */}
            {result.test_results && result.test_results.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Test Cases</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {result.test_results.map((test, idx) => (
                    <div key={idx} className="bg-white rounded p-2 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        {test.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium">Test {idx + 1}</span>
                        {test.points && (
                          <Badge variant="outline" className="ml-auto">
                            {test.points} pts
                          </Badge>
                        )}
                      </div>
                      {test.error_message && (
                        <p className="text-red-600">{test.error_message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Console Output */}
            {result.overall_result?.stdout && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Output</h4>
                <div className="bg-white rounded p-2 text-xs font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto text-gray-700">
                  {result.overall_result.stdout}
                </div>
              </div>
            )}

            {/* Errors */}
            {result.overall_result?.stderr && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-red-600">Errors</h4>
                <div className="bg-white rounded p-2 text-xs font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto text-red-700">
                  {result.overall_result.stderr}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
