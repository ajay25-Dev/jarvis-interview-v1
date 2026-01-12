import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Zap, AlertCircle } from 'lucide-react';

// Megh
interface ProgressTrackerProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  completedQuestions: number;
  totalPoints: number;
  earnedPoints: number;
  hintsUsed: number;
  submissionsCount: number;
  estimatedTimeMinutes?: number;
  timeSpentMinutes?: number;
}

export function ProgressTracker({
  currentQuestionIndex,
  totalQuestions,
  completedQuestions,
  totalPoints,
  earnedPoints,
  hintsUsed,
  submissionsCount,
  estimatedTimeMinutes = 0,
  timeSpentMinutes = 0,
}: ProgressTrackerProps) {
  const progressPercentage = Math.round((completedQuestions / totalQuestions) * 100);
  const pointsPercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          Exercise Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Questions Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Questions</span>
            <span className="text-xs text-gray-600">
              {completedQuestions} / {totalQuestions}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">{progressPercentage}% Complete</p>
        </div>

        {/* Points Progress */}
        {totalPoints > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Points</span>
              <span className="text-xs text-gray-600">
                {earnedPoints} / {totalPoints}
              </span>
            </div>
            <Progress value={pointsPercentage} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">{pointsPercentage}% Earned</p>
          </div>
        )}

        {/* Current Question */}
        <div className="pt-2 border-t border-blue-200">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <span>
              Currently on Question <strong>{currentQuestionIndex + 1}</strong> of{' '}
              <strong>{totalQuestions}</strong>
            </span>
          </div>
        </div>

        {/* Attempts & Hints */}
        <div className="pt-2 border-t border-blue-200 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Attempts
            </span>
            <Badge variant="secondary">{submissionsCount}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Hints Used
            </span>
            <Badge variant="outline">{hintsUsed}</Badge>
          </div>
        </div>

        {/* Time Info */}
        {(estimatedTimeMinutes > 0 || timeSpentMinutes > 0) && (
          <div className="pt-2 border-t border-blue-200 text-xs text-gray-600 space-y-1">
            {estimatedTimeMinutes > 0 && (
              <p>
                <span className="font-medium">Estimated Time:</span> {estimatedTimeMinutes} min
              </p>
            )}
            {timeSpentMinutes > 0 && (
              <p>
                <span className="font-medium">Time Spent:</span> {Math.round(timeSpentMinutes)} min
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
