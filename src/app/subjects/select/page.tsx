'use client';

import { useState, useEffect, Suspense, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { ArrowLeft, Loader, Check, Book, Puzzle, Table, BarChart3, Database, Code, BarChart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

const DEFAULT_SUBJECTS = ['Domain Knowledge', 'Problem Solving' , 'Google Sheet', 'Statistics', 'SQL', 'Python', 'Power BI'];

const SUBJECT_ICON_MAP: Record<string, LucideIcon> = {
  'Domain Knowledge': Book,
  'Problem Solving': Puzzle,
  'Google Sheet': Table,
  Statistics: BarChart3,
  SQL: Database,
  Python: Code,
  'Power BI': BarChart,
};

const defaultIcon: LucideIcon = Book;

function ensureDomainKnowledge(subjects: string[]) {
  if (subjects.includes('Domain Knowledge')) {
    return subjects;
  }
  return ['Domain Knowledge', ...subjects];
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

function getTopicInfo(subject?: string) {
  const safeSubject = (subject || 'General').trim() || 'General';
  const info =
    SUBJECT_TOPIC_MAP[safeSubject] || {
      topic: safeSubject,
      topic_hierarchy: safeSubject,
    };
  console.log('[getTopicInfo]', safeSubject, info);
  return info;
}

function SelectSubjectsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams.get('profile_id');
  const jdId = searchParams.get('jd_id');

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [suggestedSubjects, setSuggestedSubjects] = useState<string[]>(ensureDomainKnowledge(DEFAULT_SUBJECTS));
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(ensureDomainKnowledge(DEFAULT_SUBJECTS));
  const [company, setCompany] = useState('');
  const [profile, setProfile] = useState<{
    company_name?: string | null;
    experience_level?: string | null;
    industry?: string | null;
    target_role?: string | null;
  } | null>(null);

  // Fetch company and suggested subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!profileId || !jdId) {
        setError('Missing profile or job description');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        let companyName = '';
        const profileRes = await fetch('/api/profile');
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
          companyName = profileData?.company_name || '';
          setCompany(companyName);
        }

        let resolvedSubjects = DEFAULT_SUBJECTS;
        try {
          const suggestRes = await fetch('/api/interview-prep/domain-kpi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company_name: companyName || 'Tech Company' }),
          });

          if (suggestRes.ok) {
            const suggested = await suggestRes.json();
            const subjectList = suggested.suggested_subjects || suggested.subjects || DEFAULT_SUBJECTS;
            if (Array.isArray(subjectList) && subjectList.length > 0) {
              resolvedSubjects = subjectList;
            }
          }
        } catch {
          resolvedSubjects = DEFAULT_SUBJECTS;
        }

        const subjectsWithDomain = ensureDomainKnowledge(resolvedSubjects);
        setSuggestedSubjects(subjectsWithDomain);
        setSelectedSubjects(subjectsWithDomain);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load subjects');
        const fallbackSubjects = ensureDomainKnowledge(DEFAULT_SUBJECTS);
        setSuggestedSubjects(fallbackSubjects);
        setSelectedSubjects(fallbackSubjects);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [profileId, jdId]);

  const toggleSubject = (subject: string) => {
    if (subject === 'Domain Knowledge') {
      return;
    }
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const summaryRoleValue = profile?.target_role || selectedSubjects[0] || 'Not detected';

  const buildAuthHeaders = async () => {
    const supabase = supabaseBrowser();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.user?.id) {
      headers['x-user-id'] = session.user.id;
    }
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  const handleGenerate = async () => {
    if (selectedSubjects.length === 0) {
      setError('Please select at least one subject');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const headers = await buildAuthHeaders();

      // Generate interview plan
      const planResponse = await fetch('/api/plan', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          profile_id: parseInt(profileId!),
          jd_id: parseInt(jdId!),
          suggested_subjects: selectedSubjects,
        }),
      });

      if (!planResponse.ok) {
        const err = await planResponse.json();
        throw new Error(err.details || 'Failed to generate plan');
      }

      await planResponse.json();

      // Generate practice exercises for selected subjects
      try {
        const domain =
          profile?.company_name || profile?.industry || 'General';
        const learnerLevel = mapExperienceToLearnerLevel(
          profile?.experience_level,
        );
        const { topic, topic_hierarchy } = getTopicInfo(
          selectedSubjects[0] || domain,
        );
        const solutionLanguage = resolveSubjectSolutionLanguage(
          selectedSubjects[0] || domain,
        );

        console.log({
          profile_id: parseInt(profileId!),
          jd_id: parseInt(jdId!),
          subjects: selectedSubjects,
          domain,
          learner_level: learnerLevel || 'Beginner',
          topic,
          topic_hierarchy,
          future_topics: [],
          question_count: 8,
          solution_language: solutionLanguage,
        });

        for (const subject of selectedSubjects) {
          const { topic: subjectTopic, topic_hierarchy: subjectTopicHierarchy } =
            getTopicInfo(subject);

          if (subject === 'Domain Knowledge') {
            continue;
          }

          const exercisesResponse = await fetch(
            '/api/interview-prep/practice-exercises',
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                profile_id: parseInt(profileId!),
                jd_id: parseInt(jdId!),
                subject,
                domain,
                learner_level: learnerLevel || 'Beginner',
                topic: subjectTopic,
                topic_hierarchy: subjectTopicHierarchy,
                future_topics: [],
                question_count: 8,
                solution_language: resolveSubjectSolutionLanguage(subject),
              }),
            },
          );

          if (!exercisesResponse.ok) {
            console.warn(
              `Failed to generate practice exercises for ${subject}, but plan was created`,
            );
          }
        }
      } catch (exerciseError) {
        console.warn('Practice exercise generation error:', exerciseError);
      }

      router.push('/plan');
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate interview plan');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <LoadingFallback />;
  }

    const snapshotGradientStyles: CSSProperties & Record<string, string> = {
      background: 'linear-gradient(45deg, #3F51B5, #673AB7)',
    };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <header className="relative overflow-hidden bg-white/0">
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
          <div style={{ background: 'linear-gradient(90deg, #e9f8f3 0%, #f6fffc 50%, #ffffff 100%)' }} className="rounded-[10px] border border-slate-200 bg-white/90 p-6 shadow-lg shadow-indigo-200/40">
            <p className="text-xs uppercase tracking-[0.45em] text-emerald-500">Finalize your prep</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">Select the interview subjects that matter</h1>
            <p className="mt-2 text-sm text-slate-500">
              Jarvis will build practice plans for the subjects you care about, tuned to the JD and your profile.
            </p>
          </div>

          <section className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-500">
            {['JD Insight', 'Snapshot', 'Profile', 'Subjects'].map((step, idx) => (
              <div
                key={step}
                className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-sm shadow-indigo-100"
              >
                <span
                  className={`flex h-3 w-3 items-center justify-center rounded-full border ${idx <= 2 ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 bg-white'}`}
                >
                  <span className="sr-only">{step}</span>
                </span>
                <span className={idx <= 2 ? 'text-indigo-500' : ''}>{step}</span>
              </div>
            ))}
          </section>
        </div>
      </header>

      <main className="mx-auto mb-16 mt-0 max-w-6xl px-4 sm:px-5">
        <Card className="overflow-hidden rounded-[10px] border border-white/20 bg-white shadow-lg shadow-indigo-200/40">
          <CardContent className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:gap-5 lg:px-5">
            <div className="flex-1 space-y-6">
              <div style={snapshotGradientStyles} className="rounded-[10px] border border-slate-900/10 bg-gradient-to-b from-slate-950/90 via-slate-900/80 to-slate-900/60 p-6 text-white shadow-[0_3px_5px_rgba(15,23,42,0.45)]">
                <div className="space-y-2">
                  <p className="text-[13px] uppercase tracking-[0.1em] text-white/100">Job snapshot</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-white/100">Confidence</span>
                    <span className="text-xs rounded-full border border-white/30 px-3 py-1 uppercase tracking-[0.3em] text-white/100">
                      High
                    </span>
                  </div>
                </div>

                <div style={{ letterSpacing: '0px' }} className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <SummaryStat label="Company" value={company || 'Not detected'} highlight />
                  <SummaryStat label="Role" value={summaryRoleValue} highlight />
                  <SummaryStat label="Subjects" value={`${selectedSubjects.length || 0} selected`} highlight />
                  <SummaryStat
                    label="Plan focus"
                    value={
                      selectedSubjects[0]
                        ? `Starting with ${selectedSubjects[0]}`
                        : 'Pick a subject'
                    }
                    highlight
                  />
                </div>

                <div className="mt-6 space-y-2">
                  <p className="text-xs uppercase tracking-[0.1em] text-white/100">Selected topics</p>
                  {selectedSubjects.length === 0 ? (
                    <p className="text-sm text-white/70">No topics yet - pick subjects to see the plan.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 text-[11px] text-white/90">
                      {selectedSubjects.map(subject => (
                        <span
                          key={subject}
                          className="rounded-[10px] border border-white/20 bg-white/10 px-3 py-1 font-semibold"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="space-y-4 rounded-[10px] border border-slate-200 bg-white/80 p-5 shadow-lg shadow-indigo-100/40">
                <div  style={{ marginBottom: '5px' }} className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-indigo-500">Step 3</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">Choose interview topics</h2>
                  </div>
                  {/* <Badge className="px-3 py-1 text-xs uppercase tracking-[0.1em]">
                    Select
                  </Badge> */}
                </div>
                <p className="text-sm text-slate-500">
                  {company
                    ? `Based on ${company}, we recommend these subjects as core preparation pillars.`
                    : 'Pick the areas where you want Jarvis to guide your practice.'}
                </p>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
                  {suggestedSubjects.map(subject => {
                    const isSelected = selectedSubjects.includes(subject);
                    const Icon = SUBJECT_ICON_MAP[subject] || defaultIcon;
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleSubject(subject)}
                        className={`relative flex h-40 flex-col items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-5 text-center text-slate-900 transition-shadow duration-200 ${
                          isSelected
                            ? 'rounded-[10px] border-emerald-400 bg-emerald-50 shadow-[0_0px_0px_rgba(16,185,129,0.25)]'
                            : 'hover:border-slate-300 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]'
                        }`}
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="text-base font-semibold text-slate-900">{subject}</p>
                        <p className="text-xs tracking-[0.1em] text-slate-400">
                          {getSubjectDescription(subject)}
                        </p>
                        <span
                          className={`pointer-events-none absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border transition ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg'
                              : 'border-slate-300 bg-white text-slate-300'
                          }`}
                        >
                          {isSelected ? <Check className="h-4 w-4" /> : <span className="h-3 w-3 rounded-full bg-transparent" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  {selectedSubjects.length === 0
                    ? 'Select at least one topic to enable the practice plan.'
                    : `${selectedSubjects.length} topic${selectedSubjects.length !== 1 ? 's' : ''} selected.`}
                </div> */}

                {error && (
                  <div className="rounded-[18px] border border-red-300 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
                    {error}
                  </div>
                )}

                <div style={{ marginTop: '30px' }} className="flex flex-col gap-5 lg:flex-row">
                  <Link
                    href={`/profile/from-jd?jd_id=${jdId}`}
                    className="flex-1"
                  >
                    <Button
                      variant="outline"
                      className="w-full rounded-[10px] border border-slate-300 px-4 py-3 font-semibold tracking-[0.1em]"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </div>
                    </Button>
                  </Link>
                  <Button
                    onClick={handleGenerate}
                    disabled={generating || selectedSubjects.length === 0}
                    className="flex-1 rounded-[10px] px-6 py-3 text-sm font-semibold tracking-[0.1em] text-white shadow-[0_3px_5px_rgba(79,70,229,0.35)]"
                    style={{ background: 'linear-gradient(129deg, rgb(97, 95, 255), rgb(173, 70, 255))' }}
                  >
                    {generating ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader className="h-4 w-4 animate-spin text-white" />
                        Generating Plan...
                      </div>
                    ) : (
                      'Generate Interview Plan'
                    )}
                  </Button>
                </div>

                <p style={{ margin: '30px 0px 10px 0px' }} className="text-center text-xs tracking-[0.1em] text-slate-400">
                  A tailored plan will be ready based on your<br></br> selected subjects and the JD.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-10 h-10 animate-spin mx-auto mb-4 text-indigo-500" />
        <p className="text-xm text-slate-600">Loading subjects...</p>
        {/* <p className="text-xs uppercase tracking-[0.4em] text-slate-400 mt-2">Step 3 of 3</p> */}
      </div>
    </div>
  );
}

export default function SelectSubjectsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SelectSubjectsContent />
    </Suspense>
  );
}

function getSubjectDescription(subject: string): string {
  const descriptions: Record<string, string> = {
    SQL: 'Database queries, joins, aggregations, and data manipulation',
    Python: 'Core language features, algorithms, and data structures',
    'Power BI': 'Dashboard creation, data visualization, and reporting',
    'Tableau': 'Visual analytics, dashboard design, and storytelling',
    Statistics: 'Probability, distributions, hypothesis testing, and inference',
    'Case Studies': 'Real-world problem solving and business scenarios',
    'Communication': 'Presenting findings and explaining technical concepts',
    'Machine Learning': 'Supervised learning, models, and evaluation metrics',
    Excel: 'Advanced formulas, pivot tables, and data analysis',
    'AWS': 'Cloud services, EC2, S3, and database solutions',
  };
  return descriptions[subject] || 'Interview preparation topic';
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

function SummaryStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const wrapperStyle = highlight
    ? 'border border-white/30 bg-black/10 shadow-[0_12px_40px_rgba(15,23,42,0.6)]'
    : 'border border-slate-700 bg-black/80 shadow-none';

  return (
    <div style={{ backgroundColor: '#fff' }} className={`rounded-[10px] px-4 py-3 ${wrapperStyle}`}>
      <p style={{ fontWeight: 'bold' }}
        className={`text-[12px] uppercase text-slate-900 tracking-[0.1em] ${
          highlight ? 'text-black/100' : 'text-slate-900'
        }`}
      >
        {label}
      </p>
      <p className={`text-sm ${highlight ? 'text-black' : 'text-slate-500'}`}>
        {value}
      </p>
    </div>
  );
}
