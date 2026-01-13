'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader, Code2, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { JsonObject } from '@/components/practice/types';
import { formatDatasetValue } from '@/lib/utils';

interface PracticeQuestion {
  id: string;
  subject: string;
  text: string;
  difficulty: string;
  topics: string[];
  hint?: string;
  expected_answer: string;
  adaptive_note?: string;
}

interface PracticeExerciseSet {
  id?: string;
  profile_id: number;
  jd_id: number;
  subject: string;
  questions: PracticeQuestion[];
  dataset_description?: string;
  data_creation_sql?: string;
  data_creation_python?: string;
  dataset_csv?: string;
  datasets?: Array<{
    name?: string;
    description?: string;
    table_name?: string;
    columns?: string[];
    creation_sql?: string;
    data?: JsonObject[];
  }>;
  created_at?: string;
}

function ExercisesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectParam = searchParams.get('subject');
  const planIdParam = searchParams.get('plan_id');
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<PracticeExerciseSet[]>([]);
  const [error, setError] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const detailSectionRef = useRef<HTMLDivElement | null>(null);

  const normalizeQuestionText = (value?: string) => {
    if (!value) return '';
    const cleaned = value
      .replace(/<pre[^>]*>/gi, '\n')
      .replace(/<\/pre>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/strong>/gi, '\n')
      .replace(/<strong[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '');

    return cleaned
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');
  };

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (subjectParam) {
          params.append('subject', subjectParam);
        }
        if (planIdParam) {
          params.append('plan_id', planIdParam);
        }
        const queryString = params.toString();
        const url = `/api/interview-prep/practice-exercises${queryString ? `?${queryString}` : ''}`;
        const supabase = supabaseBrowser();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.user?.id) {
          headers['x-user-id'] = session.user.id;
        }
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const response = await fetch(url, {
          headers,
        });
        if (!response.ok) {
          throw new Error('Failed to fetch exercises');
        }
        const data = await response.json();
        setExercises(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching exercises:', err);
        setError('Failed to load practice exercises. You can still access your interview plan.');
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, [subjectParam, planIdParam]);

  useEffect(() => {
    if (subjectParam && exercises.length > 0) {
      const match = exercises.find(e => e.subject.toLowerCase().includes(subjectParam.toLowerCase()));
      if (match) {
        setExpandedSubject(match.subject);
      }
    }
  }, [exercises, subjectParam, planIdParam]);

  useEffect(() => {
    if (!expandedSubject) {
      return;
    }
    const timer = setTimeout(() => {
      detailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(timer);
  }, [expandedSubject]);

  const solveButtonClassName =
    'gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-200/70 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

  const getDifficultyColor = (difficulty: string) => {
    const lower = difficulty.toLowerCase();
    if (lower.includes('beginner') || lower.includes('easy')) return 'bg-green-100 text-green-800';
    if (lower.includes('intermediate') || lower.includes('medium')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading practice exercises...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-lg font-semibold text-gray-900">Practice Exercises</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {exercises.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Exercises Yet</h3>
              <p className="text-gray-600 mb-6">
                Practice exercises will be generated when you create an interview plan.
              </p>
              <Link href="/plan">
                <Button>Back to Plan</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {exercises.map((exerciseSet) => {
                const datasetReady =
                  Boolean(exerciseSet.dataset_description) ||
                  (exerciseSet.datasets && exerciseSet.datasets.length > 0);
                const isExpanded = expandedSubject === exerciseSet.subject;
                const truncatedDescription = exerciseSet.dataset_description
                  ? exerciseSet.dataset_description.length > 140
                    ? `${exerciseSet.dataset_description.substring(0, 140)}...`
                    : exerciseSet.dataset_description
                  : 'Dataset metadata unlocks after your plan syncs.';

                return (
                  <div
                    key={exerciseSet.id || exerciseSet.subject}
                  className={`group relative overflow-hidden rounded-2xl border bg-white/80 shadow-sm transition duration-200 ${
                      isExpanded
                        ? 'border-blue-300 shadow-lg'
                        : 'border-gray-200 hover:shadow-xl'
                    }`}
                  >
                    <div
                      className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 transition group-hover:opacity-100"
                      aria-hidden="true"
                    />
                    <div
                      onClick={() =>
                        setExpandedSubject(
                          isExpanded ? null : exerciseSet.subject
                        )
                      }
                      className="cursor-pointer space-y-4 px-6 py-6 lg:px-8"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                            Practice Focus
                          </p>
                          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Code2 className="w-5 h-5 text-primary" />
                            {exerciseSet.subject}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {exerciseSet.questions.length} curated questions
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant="secondary"
                            className={`rounded-full px-3 py-1 text-[11px] ${
                              datasetReady
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {datasetReady ? 'Dataset ready' : 'Dataset pending'}
                          </Badge>
                          <p className="text-[11px] text-gray-500 mt-1">
                            {exerciseSet.datasets?.length
                              ? `${exerciseSet.datasets.length} source${exerciseSet.datasets.length > 1 ? 's' : ''}`
                              : 'waiting for tables'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {truncatedDescription}
                        </p>
                        {exerciseSet.datasets?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {exerciseSet.datasets.map((dataset) => (
                              <span
                                key={dataset.name || dataset.table_name || `${exerciseSet.subject}-dataset`}
                                className="px-3 py-1 rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700 border border-blue-100"
                              >
                                {dataset.table_name || dataset.name || 'dataset'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600 border border-gray-200">
                              Awaiting dataset
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 uppercase tracking-wide">
                        <span>Tap to expand</span>
                        <span className="text-xs font-semibold text-primary">
                          {isExpanded ? 'Hide details' : 'View dataset & questions'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expanded Questions View */}
              {expandedSubject && (() => {
                const currentExerciseSet = exercises.find((e) => e.subject === expandedSubject);
                if (!currentExerciseSet) return null;

              return (
                <div ref={detailSectionRef}>
                  <Card>
                  <CardHeader>
                    <CardTitle>
                      {currentExerciseSet.subject} - Questions
                    </CardTitle>
                    <CardDescription>
                      Practice and review each question below
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(currentExerciseSet.dataset_description ||
                        currentExerciseSet.datasets?.length ||
                        currentExerciseSet.dataset_csv ||
                        currentExerciseSet.data_creation_sql ||
                        currentExerciseSet.data_creation_python) && (
                        <div className="space-y-4 mb-4 border border-dashed border-gray-200 rounded-xl bg-white p-4">
                          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            Dataset & Resources
                          </h4>
                          {currentExerciseSet.dataset_description && (
                            <p className="text-sm text-gray-600">
                              {currentExerciseSet.dataset_description}
                            </p>
                          )}

                          {currentExerciseSet.datasets?.map((dataset, idx) => {
                            const sampleRows = dataset.data?.slice(0, 3) || [];
                            const sampleRow = sampleRows[0];
                            const inferredColumnKeys =
                              sampleRow && typeof sampleRow === 'object'
                                ? Object.keys(sampleRow)
                                : [];
                            const columnKeys =
                              dataset.columns?.length && dataset.columns.length > 0
                                ? dataset.columns
                                : inferredColumnKeys;

                            return (
                              <div key={`dataset-summary-${idx}`} className="space-y-2 rounded-lg border border-gray-100 p-3 bg-gray-50">
                                <p className="text-xs uppercase tracking-wide text-gray-500">
                                  {dataset.table_name || dataset.name || `Dataset ${idx + 1}`}
                                </p>
                                {dataset.description && (
                                  <p className="text-sm text-gray-700">
                                    {dataset.description}
                                  </p>
                                )}
                                {columnKeys.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {columnKeys.map((column) => (
                                      <Badge key={`col-${column}`} variant="outline" className="text-[11px]">
                                        {column}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {sampleRows.length > 0 && (
                                  <div className="overflow-x-auto rounded border border-gray-200">
                                    <table className="min-w-full text-[11px] text-left text-gray-800">
                                      <thead className="bg-white text-gray-500 uppercase">
                                        <tr>
                                          {columnKeys.map((column) => (
                                            <th key={`head-${column}`} className="px-2 py-1">
                                              {column}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {sampleRows.map((row, rowIdx) => (
                                          <tr key={`row-${rowIdx}`} className="border-t border-gray-100">
                                            {columnKeys.map((column, colIdx) => (
                                              <td key={`cell-${rowIdx}-${colIdx}`} className="px-2 py-1">
                                                {formatDatasetValue(row[column])}
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                                {dataset.creation_sql && (
                                  <div>
                                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                      SQL Creation Snippet
                                    </p>
                                    <pre className="bg-gray-900 text-white text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                      {dataset.creation_sql}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {currentExerciseSet.dataset_csv && (
                            <div>
                              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                Sample CSV
                              </p>
                              <pre className="bg-gray-100 text-xs text-gray-800 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                {currentExerciseSet.dataset_csv.split('\n').slice(0, 6).join('\n')}
                                {currentExerciseSet.dataset_csv.split('\n').length > 6 && (
                                  <span className="text-[11px] text-gray-500 block mt-1">
                                    …truncated for preview
                                  </span>
                                )}
                              </pre>
                            </div>
                          )}

                          {currentExerciseSet.data_creation_sql && (
                            <div>
                              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                Dataset Creation SQL
                              </p>
                              <pre className="bg-gray-900 text-white text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                {currentExerciseSet.data_creation_sql}
                              </pre>
                            </div>
                          )}

                          {currentExerciseSet.data_creation_python && (
                            <div>
                              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                Dataset Creation Python
                              </p>
                              <pre className="bg-gray-900 text-white text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                {currentExerciseSet.data_creation_python}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                      {currentExerciseSet.questions.map((question, idx) => (
                        <Card
                          key={question.id}
                          className="border-gray-200 hover:border-primary/50 transition-colors"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <CardTitle className="text-base">Question {idx + 1}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                            {normalizeQuestionText(question.text)}
                          </p>
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                <Badge className={getDifficultyColor(question.difficulty)}>
                                  {question.difficulty}
                                </Badge>
                                {question.topics && question.topics.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {question.topics.length} topics
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex gap-3 mt-4">
                              {currentExerciseSet.subject.toLowerCase().includes('problem solving') ? (
                                <Button
                                  size="sm"
                                  asChild
                                  className={solveButtonClassName}
                                >
                                  <a
                                    href={(() => {
                                      const params = new URLSearchParams();
                                      if (planIdParam) params.set('plan_id', planIdParam);
                                      if (currentExerciseSet.id) params.set('exercise_id', currentExerciseSet.id);
                                      if (question.id) params.set('question_id', question.id);
                                      const query = params.toString();
                                      return `/problem-solving/practice${query ? `?${query}` : ''}`;
                                    })()}
                                  >
                                    <Code2 className="w-4 h-4" />
                                    Solve
                                  </a>
                                </Button>
                              ) : (
                                <Link href={`/practice/${currentExerciseSet.id}/question/${question.id}`}>
                                  <Button size="sm" className={solveButtonClassName}>
                                    <Code2 className="w-4 h-4" />
                                    Solve
                                  </Button>
                                </Link>
                              )}
                            </div>

                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                  </Card>
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}

const exercisesPageFallback = (
  <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
    <div className="text-center">
      <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
      <p className="text-gray-600">Loading practice exercises...</p>
    </div>
  </div>
);

export default function ExercisesPage() {
  return (
    <Suspense fallback={exercisesPageFallback}>
      <ExercisesPageContent />
    </Suspense>
  );
}
