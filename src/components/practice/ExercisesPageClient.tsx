'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader, Code2, BookOpen, ChevronDown, Book, Puzzle, Table, BarChart3, Database, Code, BarChart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { JsonObject } from '@/components/practice/types';
import { getDemoUserId } from '@/lib/demo-user';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

interface PracticeDatasetDefinition {
  name?: string;
  description?: string;
  table_name?: string;
  columns?: string[];
  creation_sql?: string;
  data?: JsonObject[];
}

interface PracticeExerciseSet {
  id?: string;
  profile_id: number;
  jd_id: number;
  subject: string;
  title?: string;
  questions: PracticeQuestion[];
  dataset_description?: string;
  data_creation_sql?: string;
  data_creation_python?: string;
  dataset_csv?: string;
  datasets?: PracticeDatasetDefinition[];
  created_at?: string;
  business_context?: string;
  header_text?: string;
}

interface SubjectMetadata {
  key: string;
  normalized: string;
  header_text?: string;
  business_context?: string;
}

interface PlanSubjectData {
  subject?: string | null;
  header_text?: string | null;
  business_context?: string | null;
  domain_knowledge_text?: string | null;
  summary?: string | null;
}

type SubjectPrepIndex = Record<string, PlanSubjectData>;

interface PlanDetails {
  profile_id: number;
  jd_id: number;
  job_description?: {
    company_name?: string;
    industry?: string;
  };
  profile?: {
    company_name?: string;
    experience_level?: string | null;
  };
}

const ADD_SUBJECT_OPTIONS = [
  'Domain Knowledge',
  'Problem Solving',
  'Google Sheet',
  'Statistics',
  'SQL',
  'Python',
  'Power BI',
];

const SUBJECT_ICON_MAP: Record<string, LucideIcon> = {
  'Domain Knowledge': Book,
  'Problem Solving': Puzzle,
  'Google Sheet': Table,
  Statistics: BarChart3,
  SQL: Database,
  Python: Code,
  'Power BI': BarChart,
};

const DEFAULT_SUBJECT_ICON: LucideIcon = Code;

const formatSubjectTitle = (value: string) =>
  value.replace(/\s*-\s*Plan\s+\d+$/i, '').trim();

const normalizeSubjectName = (value?: string) =>
  formatSubjectTitle(value || '').toLowerCase();

const getSubjectIcon = (subject?: string) => {
  const base = formatSubjectTitle(subject || '');
  return SUBJECT_ICON_MAP[base] || DEFAULT_SUBJECT_ICON;
};

function getTopicInfo(subject?: string) {
  const safeSubject = (subject || 'General').trim() || 'General';
  return (
    SUBJECT_TOPIC_MAP[safeSubject] || {
      topic: safeSubject,
      topic_hierarchy: safeSubject,
    }
  );
}

function mapExperienceToLearnerLevel(
  experience?: string | null,
): 'Beginner' | 'Intermediate' | 'Advanced' {
  if (!experience) return 'Intermediate';
  const lower = experience.toLowerCase();
  if (lower.includes('entry') || lower.includes('junior')) {
    return 'Beginner';
  }
  if (lower.includes('senior') || lower.includes('lead')) {
    return 'Advanced';
  }
  return 'Intermediate';
}

function resolveSubjectSolutionLanguage(
  subject?: string | null,
): string {
  const normalized = (subject || '').trim().toLowerCase();
  if (
    normalized === 'google_sheets' ||
    normalized === 'google sheet' ||
    normalized === 'google sheets' ||
    normalized === 'sheets' ||
    normalized === 'sheet' ||
    normalized === 'statistics' ||
    normalized === 'statistic'
  ) {
    return 'excel formula';
  }
  if (normalized === 'python') {
    return 'python';
  }
  if (normalized === 'sql') {
    return 'sql';
  }
  return subject?.trim() || 'sql';
}

const SUBJECT_TOPIC_MAP: Record<
  string,
  { topic: string; topic_hierarchy: string }
> = {
  SQL: { topic: 'Joins, Window functions, case when, CTE', topic_hierarchy: 'Select, Where, Group By, Having, Joins, Window functions, case when, CTE' },
  Python: {
    topic: 'Data analysis using data frames',
    topic_hierarchy: 'Variables, Functions, Pandas, Plotting, Data Structure, Data analysis using data frames',
  },
  'Power BI': {
    topic: 'Reporting',
    topic_hierarchy: 'Data Modeling, DAX, Visualizations, Publishing',
  },
  Statistics: {
    topic: 'EDA using google sheet functions or Pivot table',
    topic_hierarchy: 'Summary Stats, Distributions, Hypothesis Testing, EDA using google sheet functions or Pivot table',
  },
  'Case Studies': {
    topic: 'Business Problem Framing',
    topic_hierarchy: 'Context, Problem Statement, KPIs, Recommendations',
  },
  Communication: {
    topic: 'Storytelling',
    topic_hierarchy: 'Narrative, Visuals, Recommendations',
  },
};

const markdownComponents: Components = {
  h1: ({ node, ...props }) => {
    void node;
    return (
      <h1 className="text-lg font-semibold text-blue-900" {...props} />
    );
  },
  h2: ({ node, ...props }) => {
    void node;
    return (
      <h2 className="text-base font-semibold text-blue-900" {...props} />
    );
  },
  h3: ({ node, ...props }) => {
    void node;
    return (
      <h3 className="text-base font-semibold text-blue-900" {...props} />
    );
  },
  p: ({ node, ...props }) => {
    void node;
    return <p className="leading-relaxed" {...props} />;
  },
  li: ({ node, ...props }) => {
    void node;
    return <li className="ml-4 list-disc leading-relaxed" {...props} />;
  },
  table: ({ node, ...props }) => {
    void node;
    return (
      <div className="overflow-x-auto">
        <table
          className="min-w-full border border-blue-200 text-left text-xs text-blue-900"
          {...props}
        />
      </div>
    );
  },
  th: ({ node, ...props }) => {
    void node;
    return (
      <th
        className="border border-blue-200 bg-blue-100 px-2 py-1 font-semibold"
        {...props}
      />
    );
  },
  td: ({ node, ...props }) => {
    void node;
    return <td className="border border-blue-200 px-2 py-1" {...props} />;
  },
  hr: () => <div className="border-t border-blue-200 my-4" />,
};

const DomainKnowledgeMarkdown = ({ text }: { text: string }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
    {text}
  </ReactMarkdown>
);

interface ExercisesPageClientProps {
  planIdOverride?: string | null;
}

export function ExercisesPageClient({ planIdOverride }: ExercisesPageClientProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectParam = searchParams.get('subject');
  const planIdParam = planIdOverride ?? searchParams.get('plan_id');
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<PracticeExerciseSet[]>([]);
  const [error, setError] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const detailSectionRef = useRef<HTMLDivElement | null>(null);
  const [planSubjects, setPlanSubjects] = useState<string[] | null>(
    planIdParam ? null : [],
  );
  const [domainKnowledgeText, setDomainKnowledgeText] = useState<string>('');
  const [domainKnowledgeHeading, setDomainKnowledgeHeading] = useState<string>('');
  const [planSubjectMetadata, setPlanSubjectMetadata] = useState<SubjectMetadata[]>([]);
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);
  const [addingSubject, setAddingSubject] = useState(false);
  const [addSubjectStatus, setAddSubjectStatus] = useState('');
  const [subjectBeingAdded, setSubjectBeingAdded] = useState<string | null>(null);
  const isPlanPage = Boolean(planIdParam);
  const isPlanSubjectsLoading = isPlanPage && planSubjects === null;

  const buildAuthHeaders = useCallback(async () => {
    const supabase = supabaseBrowser();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    const userIdHeader = session?.user?.id || getDemoUserId();
    headers['x-user-id'] = userIdHeader;
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  }, []);

  const domainKnowledgeHeadingLabel = domainKnowledgeHeading || 'Domain Knowledge Brief';

  const normalizedPlanSubjects = useMemo(() => {
    const subjects = planSubjects ?? [];
    return subjects
      .map((subject) => normalizeSubjectName(subject))
      .filter((value) => value.length > 0);
  }, [planSubjects]);

  const availableAddSubjects = useMemo(() => {
    const existing = new Set(normalizedPlanSubjects);
    return ADD_SUBJECT_OPTIONS.filter(
      (subject) => !existing.has(normalizeSubjectName(subject)),
    );
  }, [normalizedPlanSubjects]);

  const findSubjectMetadata = useCallback(
    (subject?: string) => {
      if (!subject || planSubjectMetadata.length === 0) {
        return undefined;
      }
      const normalizedSubject = normalizeSubjectName(subject);
      return planSubjectMetadata.find((meta) => meta.normalized === normalizedSubject);
    },
    [planSubjectMetadata],
  );

  const filteredExercises = useMemo(() => {
    if (!planIdParam || planSubjects === null) {
      return planIdParam ? [] : exercises;
    }
    if (normalizedPlanSubjects.length === 0) {
      return [];
    }

    return exercises.filter((exercise) => {
      const normalizedValue = normalizeSubjectName(exercise.subject || exercise.title);
      return normalizedPlanSubjects.includes(normalizedValue);
    });
  }, [planIdParam, exercises, normalizedPlanSubjects, planSubjects]);

  const handleAddSubject = async (subject: string) => {
    if (!planDetails) {
      setAddSubjectStatus('Plan details are missing.');
      return;
    }
    if (!subject) {
      return;
    }
    setSubjectBeingAdded(subject);
    setAddSubjectStatus('');
    try {
      const headers = await buildAuthHeaders();
      const domain =
        planDetails?.job_description?.company_name ||
        planDetails?.job_description?.industry ||
        planDetails?.profile?.company_name ||
        'General';
      const learnerLevel = mapExperienceToLearnerLevel(
        planDetails?.profile?.experience_level,
      );
      const topicInfo = getTopicInfo(subject);
      const solutionLanguage = resolveSubjectSolutionLanguage(subject);
      const response = await fetch('/api/interview-prep/practice-exercises', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          profile_id: planDetails.profile_id,
          jd_id: planDetails.jd_id,
          subject,
          domain,
          learner_level: learnerLevel,
          topic: topicInfo.topic,
          topic_hierarchy: topicInfo.topic_hierarchy,
          future_topics: [],
          question_count: 8,
          solution_language: solutionLanguage,
          plan_id: planIdParam ? Number(planIdParam) : undefined,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || `Failed to generate exercises for ${subject}`);
      }
      const data = await response.json();
      const generatedSets: PracticeExerciseSet[] = Array.isArray(data) ? data : [];
      const normalizedSubject = normalizeSubjectName(subject);
      setPlanSubjectMetadata((prev) => {
        const filteredMetadata = prev.filter((meta) => meta.normalized !== normalizedSubject);
        return [
          ...filteredMetadata,
          {
            key: subject,
            normalized: normalizedSubject,
            header_text: subject,
            business_context: '',
          },
        ];
      });
      setPlanSubjects((prev) => {
        const existing = prev ?? [];
        if (existing.some((item) => normalizeSubjectName(item) === normalizedSubject)) {
          return existing;
        }
        return [...existing, subject];
      });
      if (generatedSets.length > 0) {
        setExercises((prev) => {
          const next = [...prev];
          generatedSets.forEach((incoming) => {
            const incomingSubject = incoming.subject || subject;
            const normalizedIncoming = normalizeSubjectName(incomingSubject);
            const existingIndex = next.findIndex(
              (candidate) => normalizeSubjectName(candidate.subject) === normalizedIncoming,
            );
            const payload: PracticeExerciseSet = {
              ...incoming,
              subject: incomingSubject,
            };
            if (existingIndex >= 0) {
              next[existingIndex] = { ...next[existingIndex], ...payload };
            } else {
              next.push(payload);
            }
          });
          return next;
        });
      }
      setAddSubjectStatus(`${subject} added. Syncing plan summary...`);
      await refreshPlanData();
    } catch (error) {
      console.error(error);
      setAddSubjectStatus(
        error instanceof Error ? error.message : 'Failed to add subject',
      );
    } finally {
      setSubjectBeingAdded(null);
    }
  };

  const isProblemSolvingSubject = (subject?: string) =>
    subject?.toLowerCase().includes('problem solving');

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

  const fetchExercises = useCallback(async () => {
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
      const headers = await buildAuthHeaders();
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
  }, [subjectParam, planIdParam, buildAuthHeaders]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  useEffect(() => {
    if (subjectParam && filteredExercises.length > 0) {
      const match = filteredExercises.find((e) =>
        e.subject.toLowerCase().includes(subjectParam.toLowerCase()),
      );
      if (match) {
        setExpandedSubject(match.subject);
      }
    }
  }, [filteredExercises, subjectParam, planIdParam]);

  const loadPlanData = useCallback(
    async (signal?: AbortSignal) => {
      if (!planIdParam) {
        return;
      }
      try {
        const headers = await buildAuthHeaders();
        headers['x-user-id'] = getDemoUserId();
        const response = await fetch(`/api/plan?plan_id=${planIdParam}`, {
          headers,
          signal,
        });
        if (!response.ok) {
          throw new Error('Failed to load plan data');
        }
        const planData = await response.json();
        const subjectPrep = (planData?.plan_content?.subject_prep || {}) as SubjectPrepIndex;
        const subjectKeys = Object.keys(subjectPrep);
        const fetchedSubjectsSet = new Set<string>();
        (planData?.plan_content?.subjects_covered || []).forEach((subject: string) =>
          fetchedSubjectsSet.add(subject),
        );
        subjectKeys.forEach((subject) => fetchedSubjectsSet.add(subject));
        const fetchedSubjects = Array.from(fetchedSubjectsSet);
        const rawDomainKnowledge =
          planData?.domain_knowledge_text ||
          subjectPrep['Domain Knowledge']?.domain_knowledge_text ||
          subjectPrep['Domain Knowledge']?.summary ||
          '';
        const rawDomainHeading =
          subjectPrep['Domain Knowledge']?.header_text || 'Domain Knowledge Brief';
        const metadataList = Object.entries(subjectPrep).map(([key, subjectData]) => {
          const subjectName =
            typeof subjectData?.subject === 'string'
              ? subjectData.subject.trim()
              : key;
          return {
            key,
            normalized: normalizeSubjectName(subjectName),
            header_text: subjectData?.header_text?.toString().trim(),
            business_context: subjectData?.business_context?.toString().trim(),
          };
        });

        setPlanDetails(planData);
        setPlanSubjects(
          fetchedSubjects
            .filter((subject: string | undefined): subject is string => Boolean(subject))
            .map((subject) => subject.trim())
            .filter(Boolean),
        );
        setDomainKnowledgeText(rawDomainKnowledge?.toString().trim() || '');
        setDomainKnowledgeHeading(
          rawDomainHeading?.toString().trim() || 'Domain Knowledge Brief',
        );
        setPlanSubjectMetadata(metadataList);
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') {
          return;
        }
        console.error('Failed to load plan subjects:', error);
        setPlanSubjects([]);
        setDomainKnowledgeText('');
        setDomainKnowledgeHeading('');
        setPlanSubjectMetadata([]);
      }
    },
    [planIdParam, buildAuthHeaders],
  );

  const refreshPlanData = useCallback(async () => {
    if (!planIdParam) {
      return;
    }
    await loadPlanData();
  }, [planIdParam, loadPlanData]);

  useEffect(() => {
    if (!planIdParam) {
      setPlanSubjects([]);
      setDomainKnowledgeText('');
      setDomainKnowledgeHeading('');
      setPlanSubjectMetadata([]);
      setPlanDetails(null);
      return;
    }

    setPlanSubjects(null);
    setDomainKnowledgeText('');
    setDomainKnowledgeHeading('');
    setPlanSubjectMetadata([]);
    const controller = new AbortController();
    loadPlanData(controller.signal);
    return () => controller.abort();
  }, [planIdParam, loadPlanData]);

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

  if (loading || isPlanSubjectsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading subject data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-lg font-semibold text-gray-900">Practice Exercises</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {domainKnowledgeText && (
          <Card className="mb-6 border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-0">
              <details className="group">
                <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{domainKnowledgeHeadingLabel}</p>
                    <p className="text-xs text-gray-500">Context pulled from your plan to sharpen the practice focus.</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-200 group-open:-rotate-180" />
                </summary>
                <div className="px-6 pb-4 text-sm text-blue-900 space-y-3 border-t border-gray-100">
                  <DomainKnowledgeMarkdown text={domainKnowledgeText} />
                </div>
              </details>
            </CardContent>
          </Card>
        )}

        {isPlanPage && (
          <Card className="mb-6 border border-dashed border-indigo-200 bg-indigo-50/50 shadow-sm">
            <CardContent>
              <div style={{ padding: '25px 0px 0px 0px' }} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.1em] text-indigo-500">Extend plan</p>
                    <p className="text-sm font-semibold text-gray-900">Add a new subject to this plan</p>
                  </div>
                  <Button
                    variant="outline"
                    className="text-sm text-indigo-600"
                    onClick={() => setAddingSubject((prev) => !prev)}
                  >
                    {addingSubject ? 'Cancel' : 'Add subject'}
                  </Button>
                </div>
                {addingSubject && (
                  <div className="space-y-4">
                    <p className="text-xs uppercase tracking-[0.1em] text-gray-500">
                      Pick a subject to merge into this plan
                    </p>
                    {availableAddSubjects.length > 0 ? (
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {availableAddSubjects.map((subject) => {
                          const SubjectIcon = getSubjectIcon(subject);
                          return (
                            <div
                              key={subject}
                              className="flex flex-col rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                            >
                              <div className="flex flex-1 items-center gap-2">
                                <SubjectIcon className="h-4 w-4 text-indigo-600" />
                                <p className="text-sm font-semibold text-gray-900">{subject}</p>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-1">
                                Add this focus to the current practice plan.
                              </p>
                              <Button
                                size="sm"
                                className="mt-3 min-w-[120px]"
                                onClick={() => handleAddSubject(subject)}
                                disabled={Boolean(subjectBeingAdded)}
                              >
                                {subjectBeingAdded === subject ? 'Generating...' : 'Add subject'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        All recommended subjects are already part of this plan.
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAddingSubject(false);
                          setAddSubjectStatus('');
                        }}
                      >
                        Close
                      </Button>
                      {addSubjectStatus && (
                        <p className="text-xs text-gray-600">{addSubjectStatus}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      {error && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-800">{error}</p>
          </CardContent>
        </Card>
      )}

        {filteredExercises.length === 0 ? (
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
            <div className="flex gap-5 overflow-x-auto pb-3">
              {filteredExercises.map((exerciseSet) => {
                const displaySubjectName = formatSubjectTitle(exerciseSet.subject);
                const isProblemSolving = isProblemSolvingSubject(exerciseSet.subject);
                const SubjectIcon = getSubjectIcon(exerciseSet.subject);
                const datasetReady =
                  !isProblemSolving &&
                  (Boolean(exerciseSet.dataset_description) ||
                    (exerciseSet.datasets && exerciseSet.datasets.length > 0));
                const isExpanded = expandedSubject === exerciseSet.subject;
                const truncatedDescription = isProblemSolving
                  ? ''
                  : exerciseSet.dataset_description
                    ? exerciseSet.dataset_description.length > 140
                      ? `${exerciseSet.dataset_description.substring(0, 140)}...`
                      : exerciseSet.dataset_description
                    : 'Dataset metadata unlocks after your plan syncs.';
                const badgeLabel = isProblemSolving
                  ? 'Problem solving focus'
                  : datasetReady
                    ? 'Dataset ready'
                    : 'Dataset pending';

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
                            <SubjectIcon className="w-5 h-5 text-indigo-600" />
                            {displaySubjectName}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {exerciseSet.questions.length} curated questions
                          </p>
                        </div>
                        {!isProblemSolving && (
                          <div className="text-right">
                            <Badge
                              variant="secondary"
                              className={`rounded-full px-3 py-1 text-[11px] ${
                                datasetReady
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {badgeLabel}
                            </Badge>
                            <p className="text-[11px] text-gray-500 mt-1">
                              {exerciseSet.datasets?.length
                                ? `${exerciseSet.datasets.length} source${exerciseSet.datasets.length > 1 ? 's' : ''}`
                                : 'waiting for tables'}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {truncatedDescription}
                        </p>
                        {!isProblemSolving && (
                          (exerciseSet.datasets?.length ? (
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
                          ))
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
              const currentExerciseSet = filteredExercises.find((e) => e.subject === expandedSubject);
              if (!currentExerciseSet) return null;
              const subjectMeta = findSubjectMetadata(currentExerciseSet.subject);
              const businessContextText =
                subjectMeta?.business_context?.trim() ||
                currentExerciseSet.business_context?.trim() ||
                '';
              const subjectHeaderText =
                subjectMeta?.header_text?.trim() ||
                currentExerciseSet.header_text?.trim() ||
                '';

              return (
                <div ref={detailSectionRef}>
                  <Card>
                    <CardHeader>
                      <CardTitle>{formatSubjectTitle(currentExerciseSet.subject)} Questions</CardTitle>
                      <CardDescription>Practice and review each question below</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* {!isProblemSolvingSubject(currentExerciseSet.subject) &&
                          (currentExerciseSet.dataset_description ||
                            currentExerciseSet.datasets?.length ||
                            currentExerciseSet.dataset_csv ||
                            currentExerciseSet.data_creation_sql ||
                            currentExerciseSet.data_creation_python) && (
                            <div className="space-y-4 mb-4 border border-dashed border-gray-200 rounded-xl bg-white p-4">
                              {currentExerciseSet.dataset_description && (
                                <p className="text-sm text-gray-600">
                                  {currentExerciseSet.dataset_description}
                                </p>
                              )}
                              {currentExerciseSet.dataset_csv && (
                                <div>
                                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                    Sample CSV
                                  </p>
                                  <pre className="bg-gray-100 text-xs text-gray-800 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                    {currentExerciseSet.dataset_csv.split('\n').slice(0, 6).join('\n')}
                                    {currentExerciseSet.dataset_csv.split('\n').length > 6 && (
                                      <span className="text-[11px] text-gray-500 block mt-1">
                                        Truncated for preview
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
                          )} */}

                        {(businessContextText || subjectHeaderText) && (
                          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/80 p-4 text-sm text-gray-700">
                            {subjectHeaderText && (
                              <p className="text-sm font-semibold text-gray-900 mb-2">
                                {subjectHeaderText}
                              </p>
                            )}
                            {businessContextText && (
                              <>
                                <p className="text-[11px] uppercase tracking-[0.32em] text-gray-500 mb-2">
                                  Business context
                                </p>
                                <p className="leading-relaxed whitespace-pre-line">
                                  {businessContextText}
                                </p>
                              </>
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
                                  <Button size="sm" asChild className={solveButtonClassName}>
                                    <a
                                      href={(() => {
                                        const params = new URLSearchParams();
                                        if (planIdParam) params.set('plan_id', planIdParam);
                                        if (currentExerciseSet.id) params.set('exercise_id', currentExerciseSet.id);
                                        if (question.id) params.set('question_id', question.id);
                                        const query = params.toString();
                                        return `/problem-solving/practice${query ? `?${query}` : ''}`;
                                      })()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Code2 className="w-4 h-4" />
                                      Solve Case Study
                                    </a>
                                  </Button>
                                ) : (
                                  <Link
                                    href={
                                      planIdParam
                                        ? `/practice/${currentExerciseSet.id}/question/${question.id}?plan_id=${planIdParam}`
                                        : `/practice/${currentExerciseSet.id}/question/${question.id}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button size="sm" className={solveButtonClassName}>
                                      <Code2 className="w-4 h-4" />
                                      Solve Question
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

export function ExercisesPageFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-gray-600">Loading subject data...</p>
      </div>
    </div>
  );
}
