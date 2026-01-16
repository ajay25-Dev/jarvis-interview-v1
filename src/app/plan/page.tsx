/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, BookOpen, Target, CheckCircle2, Lightbulb, Zap, AlertCircle, TrendingUp, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';

const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

const extractCompanyNameFromDomainText = (text?: string | null) => {
  if (!text) return null;
  const normalized = text.replace(/\*\*/g, '').replace(/\r/g, '');
  const match =
    normalized.match(/Company\s*Name\s*[:\-–]\s*([^\n]+)/i) ??
    normalized.match(/Company\s*[:\-–]\s*([^\n]+)/i);
  return match?.[1]?.trim() || null;
};

const resolvePlanCompanyName = (planItem: any) => {
  if (!planItem) return null;
  const domainKnowledgeText =
    planItem.domain_knowledge_text ||
    planItem.plan_content?.subject_prep?.['Domain Knowledge']
      ?.domain_knowledge_text ||
    planItem.plan_content?.subject_prep?.['Domain Knowledge']?.header_text;
  const jobCompany =
    planItem.job_description?.company_name?.trim() ||
    planItem.job_description?.industry?.trim();
  return (
    jobCompany ||
    extractCompanyNameFromDomainText(domainKnowledgeText) ||
    planItem.profile?.company_name?.trim() ||
    null
  );
};

const PAGE_SIZE = 4;

export default function PlanPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMorePlans, setHasMorePlans] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDomain, setExpandedDomain] = useState<number | null>(0);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] =
    useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);
  const isSavingPlan = migrationStatus === 'loading';
  const selectedPlan =
    plans.find((candidate) => candidate.id === selectedPlanId) ||
    plans[0] ||
    null;
  const latestPlanId = useMemo(() => {
    if (!plans.length) {
      return null;
    }
    let latestId: number | null = null;
    let latestTime = Number.NEGATIVE_INFINITY;
    plans.forEach((plan) => {
      const candidateTime = plan?.created_at
        ? new Date(plan.created_at).getTime()
        : Number.NEGATIVE_INFINITY;
      if (Number.isNaN(candidateTime) || candidateTime <= latestTime) {
        return;
      }
      const candidateId = Number(plan?.id);
      if (Number.isNaN(candidateId)) {
        return;
      }
      latestTime = candidateTime;
      latestId = candidateId;
    });
    if (latestId === null) {
      const fallbackId = Number(plans[0]?.id);
      if (!Number.isNaN(fallbackId)) {
        latestId = fallbackId;
      }
    }
    return latestId;
  }, [plans]);
  const subjectsRef = useRef<HTMLDivElement | null>(null);
  const [savedPlanIds, setSavedPlanIds] = useState<number[]>([]);
  const isPlanSaved = Boolean(
    selectedPlan?.id && savedPlanIds.includes(selectedPlan.id),
  );
  const buildAuthHeaders = useCallback(async () => {
    const supabase = supabaseBrowser();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    headers['x-user-id'] = session?.user?.id || DEMO_USER_ID;
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  }, []);

  const buildExercisesHref = () => {
    if (!selectedPlan?.id) {
      return '/exercises';
    }
    return `/exercises/plan/${selectedPlan.id}`;
  };

  const handleSavePlanData = async () => {
    if (!selectedPlan?.id) {
      setMigrationMessage('Plan ID is not available');
      setMigrationStatus('error');
      return;
    }

    setMigrationStatus('loading');
    setMigrationMessage(null);

    try {
      const headers = await buildAuthHeaders();
      const response = await fetch(
        `/api/interview-prep/plan/${selectedPlan.id}/migrate`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ overwrite_existing: true }),
        },
      );
      const data = await response.json();
      const isSuccess = response.ok && data?.success !== false;
      if (!isSuccess) {
        const message =
          data?.message || data?.error || 'Failed to save plan data';
        throw new Error(message);
      }

      setMigrationStatus('success');
      setMigrationMessage(data?.message || 'Plan data saved to Supabase');
      setSavedPlanIds((prev) => {
        if (!selectedPlan?.id) return prev;
        const next = prev.includes(selectedPlan.id)
          ? prev
          : [...prev, selectedPlan.id];
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'savedPlanIds',
            JSON.stringify(next),
          );
        }
        return next;
      });
    } catch (error) {
      console.error('Error saving plan data', error);
      setMigrationStatus('error');
      setMigrationMessage(
        error instanceof Error ? error.message : 'Plan migration failed',
      );
    }
  };

  const loadPlans = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const headers = await buildAuthHeaders();
        const response = await fetch(
          `/api/interview-prep/plans?limit=${PAGE_SIZE}&page=${pageToLoad}`,
          { headers },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load plans');
        }

        const fetchedPlans = Array.isArray(data?.plans) ? data.plans : [];
        setHasMorePlans(Boolean(data?.hasMore));
        setPlans((prev) => {
          if (!append) {
            return fetchedPlans;
          }
          const existingIds = new Set(prev.map((plan) => plan.id));
          const appendedPlans = fetchedPlans.filter(
            (plan: any) => !existingIds.has(plan.id),
          );
          return [...prev, ...appendedPlans];
        });
        setPage(pageToLoad);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        if (append) {
          setIsLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [buildAuthHeaders],
  );

  useEffect(() => {
    loadPlans(1, false);
  }, [loadPlans]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('savedPlanIds');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedPlanIds(parsed);
        }
      } catch (error) {
        console.error('Failed to parse saved plan IDs', error);
      }
    }
  }, []);

  const handleLoadMorePlans = () => {
    if (isLoadingMore || !hasMorePlans) {
      return;
    }
    loadPlans(page + 1, true);
  };

  const handlePlanSelect = (planId: number) => {
    setSelectedPlanId(planId);
    window.requestAnimationFrame(() => {
      subjectsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  useEffect(() => {
    if (!plans.length) {
      setSelectedPlanId(null);
      return;
    }

    setSelectedPlanId((current) => {
      if (current && plans.some((item) => item.id === current)) {
        return current;
      }
      return plans[0]?.id ?? null;
    });
  }, [plans]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <span className="text-lg font-semibold text-gray-900">Interview Prep Plan</span>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="animate-pulse">Loading plan...</div>
          </div>
        </main>
      </div>
    );
  }

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <span className="text-lg font-semibold text-gray-900">Interview Prep Plan</span>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Plan Generated Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Upload a job description to get your personalized interview prep plan.
              </p>
              <Link href="/jd/upload">
                <Button>Upload Job Description</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const planContent = selectedPlan.plan_content || {};
  const domains = planContent.domains || [];
  const caseStudies = planContent.case_studies || [];
  const estimatedHours = planContent.estimated_hours || 0;
  const subjects = planContent.subjects_covered || [];

const markdownComponents = {
  h1: ({ node, ...props }: any) => (
    <h1 className="text-lg font-semibold text-blue-900" {...props} />
  ),
  h2: ({ node, ...props }: any) => (
    <h2 className="text-base font-semibold text-blue-900" {...props} />
  ),
  h3: ({ node, ...props }: any) => (
    <h3 className="text-base font-semibold text-blue-900" {...props} />
  ),
  p: ({ node, ...props }: any) => (
    <p className="leading-relaxed" {...props} />
  ),
  li: ({ node, ...props }: any) => (
    <li className="ml-4 list-disc leading-relaxed" {...props} />
  ),
  table: ({ node, ...props }: any) => (
    <div className="overflow-x-auto">
      <table
        className="min-w-full border border-blue-200 text-left text-xs text-blue-900"
        {...props}
      />
    </div>
  ),
  th: ({ node, ...props }: any) => (
    <th
      className="border border-blue-200 bg-blue-100 px-2 py-1 font-semibold"
      {...props}
    />
  ),
  td: ({ node, ...props }: any) => (
    <td className="border border-blue-200 px-2 py-1" {...props} />
  ),
  hr: () => <div className="border-t border-blue-200 my-4" />,
};

const DomainKnowledgeMarkdown = ({ text }: { text: string }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
    {text}
  </ReactMarkdown>
);
  const subjectPrep = planContent.subject_prep || {};
  const planDomainKnowledgeText =
    selectedPlan.domain_knowledge_text ||
    subjectPrep['Domain Knowledge']?.domain_knowledge_text ||
    null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="text-lg font-semibold text-gray-900">Interview Prep Plan</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Personalized Interview Prep Plan
          </h1>
          <p className="text-gray-600">
            Follow this roadmap to prepare effectively for your interview
          </p>
        </div>

        {plans.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Saved plans
                </p>
                <p className="text-sm text-gray-600">
                  Switch between companies to review each plan.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {plans.map((planItem, index) => {
                const planCompanyName = resolvePlanCompanyName(planItem);
                const planLabel =
                  planCompanyName ||
                  planItem.profile?.target_role ||
                  `Plan ${planItem.id}`;
                const createdAtLabel = planItem.created_at
                  ? new Date(planItem.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : null;
                const planRoleLabel =
                  planItem.job_description?.role_title?.trim() ||
                  planItem.profile?.target_role;
                const secondaryLabel = [planRoleLabel, createdAtLabel]
                  .filter(Boolean)
                  .join(' - ');
                const isActive = planItem.id === selectedPlan?.id;
                const isLatest = planItem.id === latestPlanId;
                return (
                  <button
                    key={planItem.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handlePlanSelect(planItem.id)}
                    className={`w-full min-w-[220px] rounded-2xl border px-4 py-3 text-left transition md:w-auto ${
                      isActive
                        ? 'border-transparent bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                        : 'border-gray-200 bg-white text-gray-800 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{planLabel}</span>
                      {isLatest && (
                        <Badge
                          variant="outline"
                          className={`text-[11px] ${
                            isActive ? 'border-white/60 text-white/80' : ''
                          }`}
                        >
                          Latest
                        </Badge>
                      )}
                    </div>
                    {secondaryLabel && (
                      <p
                        className={`text-[11px] ${
                          isActive ? 'text-white/80' : 'text-gray-500'
                        }`}
                      >
                        {secondaryLabel}
                      </p>
                    )}
                  </button>
                );
              })}
              {hasMorePlans && (
                <Button
                  type="button"
                  variant="outline"
                  className="self-center min-w-[220px] rounded-2xl border-dashed border border-blue-200 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-blue-600 transition hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleLoadMorePlans}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading plans…' : 'Load more plans'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {estimatedHours} Hours
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Focus Areas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {domains.length}
                  </p>
                </div>
                <Target className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Subjects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {subjects.length}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
          </Card>
        </div>
        {/* {planDomainKnowledgeText && (
          <div className="mb-6 border border-blue-200 bg-blue-50/70 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Domain Knowledge Brief
            </h3>
            <div className="text-sm text-blue-900 space-y-3">
              <DomainKnowledgeMarkdown text={planDomainKnowledgeText} />
            </div>
          </div>
        )} */}

        {!isPlanSaved ? (
          <Card className="mb-8 border border-blue-100 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg">Save plan data</CardTitle>
              <CardDescription>
                Persist the structured subjects, questions, answers, and datasets from this plan into Supabase so practice tables stay in sync.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-gray-700 max-w-3xl">
                  Make sure every subject, case study, and related answer is stored in the practice tables so you can start exercises immediately.
                </p>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleSavePlanData}
                  disabled={isSavingPlan}
                >
                  {isSavingPlan ? 'Saving plan data...' : 'Save plan data'}
                </Button>
              </div>
              {migrationMessage && (
                <p
                  className={`text-sm ${
                    migrationStatus === 'success'
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {migrationMessage}
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {migrationMessage || 'Plan data already saved for this plan.'}
          </div>
        )}

        {/* Subjects */}
        {subjects.length > 0 && (
          <div ref={subjectsRef} className="mb-8">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Covered Subjects</h2>
                <p className="text-gray-600">Comprehensive topics with detailed learning paths and case studies</p>
              </div>
              {selectedPlan?.id && (
                <Link href={buildExercisesHref()} target="_blank" rel="noreferrer">
                  <Button
                    variant="outline"
                    className="flex items-center gap-1 border-blue-200 bg-white px-4 py-2 text-xs uppercase tracking-wide text-blue-700 shadow-sm hover:border-blue-300"
                  >
                    <span>Start Practice</span>
                    <ArrowLeft className="w-3 h-3 rotate-180" />
                  </Button>
                </Link>
              )}
            </div>
            <div className="space-y-4">
              {subjects.map((subject: string) => {
                const relatedDomain = domains.find(
                  (d: any) => d.title.toLowerCase().includes(subject.toLowerCase()) || 
                              subject.toLowerCase().includes(d.title.toLowerCase())
                );
                const subjectData = subjectPrep[subject];
                const isExpanded = expandedSubject === subject;
                const practiceQuestions = subjectData?.questions_raw || [];
                const hasPracticeQuestions = practiceQuestions.length > 0;
                const datasetRowsSample = subjectData?.dataset_rows?.slice(0, 3) || [];
                const datasetColumns =
                  subjectData?.dataset_columns?.length
                    ? subjectData.dataset_columns
                    : datasetRowsSample.length > 0
                      ? Object.keys(datasetRowsSample[0])
                      : [];
                const dictionaryEntries = subjectData?.data_dictionary
                  ? Object.entries(subjectData.data_dictionary)
                  : [];
                const hasDatasetInfo =
                  Boolean(subjectData?.dataset_description) ||
                  datasetColumns.length > 0 ||
                  datasetRowsSample.length > 0 ||
                  Boolean(subjectData?.dataset_creation_sql) ||
                  Boolean(subjectData?.data_creation_sql) ||
                  Boolean(subjectData?.data_creation_python) ||
                  Boolean(subjectData?.dataset_csv_raw) ||
                  dictionaryEntries.length > 0 ||
                  Boolean(subjectData?.domain_knowledge_text);
                const csvSnippet = subjectData?.dataset_csv_raw
                  ? subjectData.dataset_csv_raw.split('\n').slice(0, 6).join('\n')
                  : null;
                const datasetCreationSql =
                  subjectData?.dataset_creation_sql || subjectData?.data_creation_sql;
                const pythonSnapshot = subjectData?.data_creation_python;
                const headerText = subjectData?.header_text;

                return (
                  <Card
                    key={subject}
                    className={`overflow-hidden transition-all duration-300 ${
                      isExpanded ? 'shadow-lg border-blue-300' : 'hover:shadow-md'
                    }`}
                  >
                    {/* Expandable Header */}
                    <button
                      onClick={() => setExpandedSubject(isExpanded ? null : subject)}
                      className="w-full"
                    >
                      <div className="p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                              <Lightbulb className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                              <h3 className="text-xl font-bold text-gray-900 mb-2">{subject}</h3>
                              {relatedDomain && (
                                <p className="text-sm text-gray-600 mb-3">
                                  {relatedDomain.description}
                                </p>
                              )}
                              {subjectData && (
                                <div className="flex flex-wrap gap-2">
                                  {subjectData.case_studies?.length > 0 && (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                      {subjectData.case_studies.length} Case Studies
                                    </Badge>
                                  )}
                                  {subjectData.key_learning_points?.length > 0 && (
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                      {subjectData.key_learning_points.length} Learning Points
                                    </Badge>
                                  )}
                                  {subjectData.common_mistakes?.length > 0 && (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                      {subjectData.common_mistakes.length} Common Mistakes
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-1 transition-transform duration-300 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-gray-200 bg-gray-50">
                        <div className="p-6 space-y-8">
                          {/* Subject Actions */}
                          {/* {subject?.trim().toLowerCase() !== 'domain knowledge' && (
                            <div className="flex justify-end">
                              <Link href={buildExercisesHref(subject)} target="_blank" rel="noopener noreferrer">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                  Start {subject} Practice
                                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                                </Button>
                              </Link>
                            </div>
                          )} */}

                          {headerText && (
                            <div className="bg-blue-50 border-blue-100 rounded-lg px-4 py-3 text-sm text-gray-700">
                              {headerText}
                            </div>
                          )}

                          {/* Core Topics from Domain */}
                          {relatedDomain?.core_topics && relatedDomain.core_topics.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-blue-600" />
                                Core Topics
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {relatedDomain.core_topics.map((topic: string, idx: number) => (
                                  <Badge key={idx} className="bg-blue-100 text-blue-700" variant="secondary">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* KPIs from Domain */}
                          {relatedDomain?.kpis && relatedDomain.kpis.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-600" />
                                Key Performance Indicators
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {relatedDomain.kpis.map((kpi: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-white rounded-lg border border-gray-200">
                                    <p className="font-medium text-sm text-gray-900">{kpi.name}</p>
                                    <p className="text-xs text-gray-600 mt-1">{kpi.description}</p>
                                    <Badge
                                      className={`text-xs mt-2 ${
                                        kpi.importance?.toLowerCase() === 'high'
                                          ? 'bg-red-100 text-red-700'
                                          : kpi.importance?.toLowerCase() === 'medium'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-green-100 text-green-700'
                                      }`}
                                      variant="secondary"
                                    >
                                      {kpi.importance || 'Medium'} Priority
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Case Studies */}
                          {subjectData?.case_studies && subjectData.case_studies.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-green-600" />
                                Case Studies ({subjectData.case_studies.length})
                              </h4>
                              <div className="space-y-4">
                                {subjectData.case_studies.map((caseStudy: any, csIdx: number) => (
                                  <div key={csIdx} className="p-4 bg-white rounded-lg border border-gray-200 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <h5 className="font-semibold text-gray-900">{caseStudy.title}</h5>
                                      {caseStudy.estimated_time_minutes && (
                                        <Badge variant="outline" className="text-xs flex-shrink-0">
                                          <Clock className="w-3 h-3 mr-1" />
                                          {caseStudy.estimated_time_minutes}m
                                        </Badge>
                                      )}
                                    </div>
                                    {caseStudy.problem_statement && (
                                      <div>
                                        <p className="text-xs font-medium text-gray-700 mb-1">Problem Statement</p>
                                        <p className="text-sm text-gray-600">{caseStudy.problem_statement}</p>
                                      </div>
                                    )}
                                    {caseStudy.dataset_overview && (
                                      <div>
                                        <p className="text-xs font-medium text-gray-700 mb-1">Description</p>
                                        <p className="text-sm text-gray-600">{caseStudy.description}</p>
                                      </div>
                                    )}
                                    {caseStudy.dataset_schema && (
                                      <div>
                                        <p className="text-xs font-medium text-gray-700 mb-1">Schema</p>
                                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto text-gray-700">
                                          {caseStudy.dataset_schema}
                                        </pre>
                                      </div>
                                    )}
                                    {caseStudy.questions && caseStudy.questions.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-gray-700 mb-2">Questions ({caseStudy.questions.length})</p>
                                        <ul className="space-y-2">
                                          {caseStudy.questions.map((q: any, qIdx: number) => (
                                            <li key={qIdx} className="flex gap-2">
                                              <Badge className={`text-xs flex-shrink-0 ${
                                                q.difficulty?.toLowerCase() === 'easy' ? 'bg-green-100 text-green-700' :
                                                q.difficulty?.toLowerCase() === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                'bg-red-100 text-red-700'
                                              }`}>
                                                {q.difficulty}
                                              </Badge>
                                              <p className="text-sm text-gray-700">{q.question}</p>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Key Learning Points */}
                          {subjectData?.key_learning_points && subjectData.key_learning_points.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                Key Learning Points
                              </h4>
                              <ul className="space-y-2">
                                {subjectData.key_learning_points.map((point: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-3">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                                    <span className="text-sm text-gray-700">{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Common Mistakes */}
                          {subjectData?.common_mistakes && subjectData.common_mistakes.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                Common Mistakes to Avoid
                              </h4>
                              <ul className="space-y-2">
                                {subjectData.common_mistakes.map((mistake: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                                    <span className="text-sm text-gray-700">{mistake}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {hasPracticeQuestions && (
                            <div className="space-y-4">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-yellow-600" />
                                Practice Questions ({practiceQuestions.length})
                              </h4>
                              <div className="space-y-3">
                                {practiceQuestions.map((question: any, qIdx: number) => {
                                  const questionText =
                                    question.business_question ||
                                    question.question ||
                                    question.text ||
                                    question.prompt ||
                                    question.title ||
                                    '';
                                  const answerSnippet =
                                    question.answer ||
                                    question.answer_sql ||
                                    subjectData?.answers_sql_map?.[String(question.id)] ||
                                    question.expected_answer ||
                                    question.expected_approach ||
                                    '';
                                  return (
                                    <div
                                      key={`question-${qIdx}`}
                                      className="p-4 bg-white rounded-lg border border-gray-200 space-y-2 shadow-sm"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <p
                                          className="text-sm text-gray-700 leading-relaxed"
                                          dangerouslySetInnerHTML={{ __html: questionText }}
                                        />
                                        {question.difficulty && (
                                          <Badge
                                            className={`text-xs flex-shrink-0 ${
                                              question.difficulty?.toLowerCase() === 'easy'
                                                ? 'bg-green-100 text-green-700'
                                                : question.difficulty?.toLowerCase() === 'medium'
                                                  ? 'bg-amber-100 text-amber-700'
                                                  : 'bg-red-100 text-red-700'
                                            }`}
                                          >
                                            {question.difficulty}
                                          </Badge>
                                        )}
                                      </div>
                                      {answerSnippet && (
                                        <pre className="text-xs bg-gray-900 text-white p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                          {answerSnippet}
                                        </pre>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {hasDatasetInfo && (
                            <div className="space-y-4 border-gray-200 pt-4">
                              {/* <h4 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-blue-600" />
                                Dataset & Resources
                              </h4> */}
                              {subjectData?.dataset_description && (
                                <p className="text-sm text-gray-700">
                                  {subjectData.dataset_description}
                                </p>
                              )}
                              {subjectData?.domain_knowledge_text && (
                                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 mb-3">
                                  <h4 className="text-sm font-semibold text-blue-700 mb-1">
                                    Domain Knowledge Brief
                                  </h4>
                                  <div className="text-sm text-blue-900 space-y-3">
                                    <DomainKnowledgeMarkdown
                                      text={subjectData.domain_knowledge_text}
                                    />
                                  </div>
                                </div>
                              )}
                              {subjectData?.dataset_table_name && (
                                <p className="text-xs text-gray-500 uppercase tracking-wide">
                                  Table name: {subjectData.dataset_table_name}
                                </p>
                              )}
                              {datasetColumns.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {datasetColumns.map((column: string, colIdx: number) => (
                                    <Badge
                                      key={`column-${colIdx}`}
                                      className="bg-blue-100 text-blue-700 text-xs"
                                    >
                                      {column}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {datasetColumns.length > 0 && datasetRowsSample.length > 0 && (
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                  <table className="min-w-full text-xs text-left">
                                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                                      <tr>
                                        {datasetColumns.map((column: string, colIdx: number) => (
                                          <th key={`colhead-${colIdx}`} className="px-2 py-2">
                                            {column}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                      {datasetRowsSample.map((row: any, rowIdx: number) => (
                                        <tr
                                          key={`datas-row-${rowIdx}`}
                                          className="border-t border-gray-100"
                                        >
                                          {datasetColumns.map((column: string, colIdx: number) => (
                                            <td
                                              key={`datas-cell-${rowIdx}-${colIdx}`}
                                              className="px-2 py-2 text-gray-800"
                                            >
                                              {row[column] ?? ''}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              {datasetCreationSql && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Dataset SQL
                                  </p>
                                  <pre className="bg-gray-900 text-white text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                    {datasetCreationSql}
                                  </pre>
                                </div>
                              )}
                              {pythonSnapshot && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Python data creation
                                  </p>
                                  <pre className="bg-gray-900 text-white text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                    {pythonSnapshot}
                                  </pre>
                                </div>
                              )}
                              {csvSnippet && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Sample CSV rows
                                  </p>
                                  <pre className="bg-gray-100 text-xs text-gray-800 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                    {csvSnippet}
                                    {subjectData?.dataset_csv_raw &&
                                      subjectData.dataset_csv_raw.split('\n').length > 6 && (
                                        <span className="text-[11px] text-gray-500 block mt-1">
                                          …truncated for preview
                                        </span>
                                      )}
                                  </pre>
                                </div>
                              )}
                              {dictionaryEntries.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Data dictionary
                                  </p>
                                  <ul className="text-xs text-gray-700 space-y-1">
                                    {dictionaryEntries.map(([name, description], idx) => (
                                      <li key={`dict-${idx}`} className="flex gap-2">
                                        <span className="font-semibold text-gray-800">{name}:</span>
                                        <span>{String(description ?? '')}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Focus Domains */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Focus Areas</CardTitle>
            <CardDescription>Core domains you should master</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {domains.map((domain: any, idx: number) => (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedDomain(expandedDomain === idx ? null : idx)
                    }
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-900">
                        {domain.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {domain.description}
                      </p>
                    </div>
                    <ChevronIcon
                      expanded={expandedDomain === idx}
                      className="flex-shrink-0 ml-4"
                    />
                  </button>

                  {expandedDomain === idx && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      {/* Core Topics */}
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-900 mb-2">
                          Core Topics
                        </h5>
                        <ul className="space-y-1">
                          {domain.core_topics?.map((topic: string, tidx: number) => (
                            <li key={tidx} className="flex items-start gap-2 text-sm text-gray-700">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              {topic}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* KPIs */}
                      {domain.kpis && domain.kpis.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">
                            Key Performance Indicators
                          </h5>
                          <div className="space-y-2">
                            {domain.kpis.map((kpi: any, kidx: number) => (
                              <div
                                key={kidx}
                                className="p-2 bg-white rounded border border-gray-200"
                              >
                                <p className="font-medium text-sm text-gray-900">
                                  {kpi.name}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {kpi.description}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Importance: <span className="font-medium">{kpi.importance}</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Case Studies */}
        {caseStudies.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Case Studies</CardTitle>
              <CardDescription>Real-world scenarios to practice</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {caseStudies.map((study: any, idx: number) => (
                  <div key={idx} className="pb-6 border-b border-gray-200 last:border-0">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {idx + 1}. {study.title}
                    </h4>
                    <p className="text-sm text-gray-700 mb-3">
                      {study.business_problem}
                    </p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">
                          Solution Outline
                        </p>
                        <p className="text-sm text-gray-700">
                          {study.solution_outline}
                        </p>
                      </div>
                      {study.key_learnings && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">
                            Key Learnings
                          </p>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {study.key_learnings.map((learning: string, lidx: number) => (
                              <li key={lidx} className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                {learning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {planContent.summary && (
          <Card className="mb-8 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">
                {planContent.summary}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              Back to Home
            </Button>
          </Link>
          <Link href="/jd/upload" className="flex-1">
            <Button className="w-full">Generate New Plan</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

function ChevronIcon({ expanded, className }: { expanded: boolean; className?: string }) {
  return (
    <svg
      className={`w-5 h-5 text-gray-400 transition-transform ${
        expanded ? 'rotate-180' : ''
      } ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    </svg>
  );
}
