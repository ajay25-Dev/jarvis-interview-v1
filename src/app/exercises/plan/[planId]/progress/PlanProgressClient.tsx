"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Loader, CheckCircle2 } from 'lucide-react';
import { buildAuthHeaders } from '@/lib/build-auth-headers';

type PlanProgressSubject = {
  subject: string;
  exerciseId?: string;
  questionCount: number;
  completedQuestions: number;
  correctQuestions: number;
  completionPercentage: number;
  accuracyPercentage: number;
  attemptedQuestions: number;
  wrongQuestions: number;
  notAttemptedQuestions: number;
  inProgressQuestions: number;
  latestSubmissionAt?: string | null;
};

type PlanProgressStats = {
  totalQuestions: number;
  completedQuestions: number;
  correctQuestions: number;
  completionPercentage: number;
  finalScore: number;
  lastActivityAt?: string | null;
};

type PlanProgressResponse = {
  plan_id: number;
  plan_name: string;
  stats: PlanProgressStats;
  subjects: PlanProgressSubject[];
};

interface PlanProgressClientProps {
  planId: string;
}

export function PlanProgressClient({ planId }: PlanProgressClientProps) {
  const router = useRouter();
  const [progress, setProgress] = useState<PlanProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!planId) {
      setProgress(null);
      setError('Plan identifier is missing.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadProgress = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = await buildAuthHeaders();
        const response = await fetch(`/api/plan/${planId}/progress`, {
          headers,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load plan progress');
        }
        if (!cancelled) {
          setProgress(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load plan progress at the moment.',
          );
          setProgress(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [planId]);

  const formattedSubjects = useMemo(() => {
    if (!progress) return [];
    return [...progress.subjects].sort((a, b) =>
      a.subject.localeCompare(b.subject, undefined, { sensitivity: 'base' }),
    );
  }, [progress]);

  const overallAccuracy = useMemo(() => {
    if (!progress?.stats?.totalQuestions) {
      return 0;
    }
    return (
      (progress.stats.correctQuestions / progress.stats.totalQuestions) *
      100
    );
  }, [progress]);

  const formatDate = (value?: string | null) => {
    if (!value) return 'Not available';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-xl shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 space-y-1">
            {/* <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Plan Progress</p> */}
            <h1 className="text-lg font-semibold text-slate-900">
              Plan Progress
            </h1>
            <p className="text-sm text-gray-500">
              {planId ? `Plan ID ${planId}` : 'Select a plan to view results'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/exercises/plan/${planId}`}>
              <Button variant="outline" size="sm">
                View exercises
              </Button>
            </Link>
            <Link href="/plan">
              <Button variant="ghost" size="sm">
                All plans
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {loading && (
          <div className="flex flex-col items-center justify-center space-y-2 py-12">
            <Loader className="w-10 h-10 animate-spin text-slate-200" />
            <p className="text-sm text-slate-300">Loading plan progress...</p>
          </div>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Unable to load progress</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && !progress && (
          <Card>
            <CardContent className="text-sm text-gray-600 text-center">
              No progress data is available for this plan yet. Try syncing your
              exercises or attempt a question to populate results.
            </CardContent>
          </Card>
        )}

        {!loading && !error && progress && (
          <div className="space-y-6">
            <Card className="bg-white shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle className="text-base">Overall Progress</CardTitle>
                <CardDescription>
                  {formattedSubjects.length} subject
                  {formattedSubjects.length !== 1 ? 's' : ''} tracked
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500 uppercase tracking-[0.1em]">
                      Completion
                    </p>
                    <p className="text-4xl font-bold text-gray-900">
                      {progress.stats.completionPercentage.toFixed(1)}%
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {progress.stats.completedQuestions} / {progress.stats.totalQuestions}{' '}
                      questions submitted
                    </p>
                    {progress.stats.lastActivityAt && (
                    <p className="text-xs text-slate-400 mt-1">
                      Latest activity: {formatDate(progress.stats.lastActivityAt)}
                    </p>
                    )}
                  </div>
                  <div className="flex-1">
                    <Progress
                      value={Math.min(Math.max(progress.stats.completionPercentage, 0), 100)}
                      className="h-2 rounded-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                    <p className="text-xs uppercase tracking-[0.1em] text-gray-500">
                      Final score
                    </p>
                    <p className="text-3xl font-semibold text-indigo-600">
                      {progress.stats.finalScore.toFixed(1)}%
                    </p>
                    <p className="text-sm text-slate-500">
                      {progress.stats.correctQuestions} questions marked correct
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 p-4 bg-white">
                    <p className="text-xs uppercase tracking-[0.1em] text-gray-500">
                      Accuracy
                    </p>
                    <p className="text-3xl font-semibold text-emerald-600">
                      {overallAccuracy.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-500">
                      {progress.stats.totalQuestions} total questions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              {formattedSubjects.map((subject) => (
                <Card
                  key={subject.subject}
                  className="border border-transparent bg-gradient-to-br from-white/90 via-blue-50 to-white/80 shadow-1xl backdrop-blur-lg"
                >
                  <div className="h-1 bg-gradient-to-r from-sky-500 to-blue-600" />
                  <CardContent className="p-6 pt-5 space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xl font-semibold text-slate-900">
                          {subject.subject}
                        </p>
                        <p className="text-[11px] text-slate-500 tracking-[0.1em]">
                          {subject.completedQuestions} / {subject.questionCount} questions complete
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[11px] px-3 text-slate-600">
                        {subject.questionCount} Qs
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[12px] text-slate-500 tracking-[0.1em]">
                        <span>Completion</span>
                        <span className="font-semibold text-slate-700">
                          {subject.completionPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(Math.max(subject.completionPercentage, 0), 100)}
                        className="h-2 rounded-full bg-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[12px] text-slate-500 tracking-[0.1em]">
                        <span>Accuracy</span>
                        <span className="font-semibold text-slate-700">
                          {subject.accuracyPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(Math.max(subject.accuracyPercentage, 0), 100)}
                        className="h-2 rounded-full bg-slate-200"
                      />
                    </div>
                    
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="text-[12px] px-3 py-1 text-slate-700"
                        >
                          Attempted: {subject.attemptedQuestions}
                        </Badge>
                        <Badge
                          variant="destructive"
                          className="text-[12px] px-3 py-1"
                        >
                          Wrong: {subject.wrongQuestions}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-[11px] px-3 py-1"
                        >
                          NA: {subject.notAttemptedQuestions}
                        </Badge>
                        {isProblemSolvingSubject(subject) && (
                        <Badge
                          variant="secondary"
                          className="text-[12px] px-3 py-1"
                        >
                          {subject.inProgressQuestions > 0 && (
                          <p className="mt-0 text-xs text-slate-500" style={ { color: '#c2ae04' }}>
                            {subject.inProgressQuestions} question
                            {subject.inProgressQuestions !== 1 ? 's' : ''} still in progress
                          </p>
                        )}
                        </Badge>
                        )}
                      </div>
                    
                    <div className="flex items-center justify-between text-xs text-slate-600 tracking-[0.1em]">
                      <span>Level</span>
                      <Badge
                        variant="secondary"
                        className={`text-[12px] ${getLevelBadgeClasses(
                          subject,
                        )}`}
                      >
                        {getSubjectLevel(subject)}
                      </Badge>
                    </div>
                    {shouldShowMentorChatBadge(subject) && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" style={ { backgroundColor: 'gold', border: 'none' } } className="text-[11px] px-3 py-1">
                          Mentor chat in progress
                        </Badge>
                      </div>
                    )}
                    
                    {subject.latestSubmissionAt && (
                      <p className="text-[12px] text-slate-500">
                        Last update: {formatDate(subject.latestSubmissionAt)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function getSubjectLevel(subject: PlanProgressSubject) {
  if (subject.attemptedQuestions === 0) {
    return 'Not Started';
  }
  if (subject.accuracyPercentage >= 75 && subject.completionPercentage >= 70) {
    return 'Strong';
  }
  if (subject.accuracyPercentage >= 50 || subject.completionPercentage >= 50) {
    return 'Average';
  }
  return 'Weak';
}

function getLevelBadgeClasses(subject: PlanProgressSubject) {
  const level = getSubjectLevel(subject);
  if (level === 'Strong') {
    return 'bg-emerald-100 text-emerald-900';
  }
  if (level === 'Average') {
    return 'bg-amber-100 text-amber-900';
  }
  if (level === 'Not Started') {
    return 'bg-slate-200 text-slate-800';
  }
  return 'bg-rose-100 text-rose-900';
}

function isProblemSolvingSubject(subject: PlanProgressSubject) {
  return subject.subject.toLowerCase().includes('problem solving');
}

function shouldShowMentorChatBadge(subject: PlanProgressSubject) {
  return (
    subject.subject.toLowerCase().includes('problem solving') &&
    subject.attemptedQuestions > 0 &&
    subject.completionPercentage < 100
  );
}
