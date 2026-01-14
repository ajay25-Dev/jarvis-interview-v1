/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { ArrowLeft, Loader, CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';

const DEFAULT_SUBJECTS = ['Domain Knowledge', 'Problem Solving' , 'Google Sheet', 'Statistics', 'SQL', 'Python', 'Power BI'];

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
  const [suggestedSubjects, setSuggestedSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [company, setCompany] = useState('');
  const [profile, setProfile] = useState<{
    company_name?: string | null;
    experience_level?: string | null;
    industry?: string | null;
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

        // Get profile to get company name
        const profileRes = await fetch('/api/profile');
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
          setCompany(profileData?.company_name || '');
        }

        // Try to fetch suggested subjects from backend
        try {
          const suggestRes = await fetch('/api/interview-prep/domain-kpi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company_name: company || 'Tech Company' }),
          });

          if (suggestRes.ok) {
            const suggested = await suggestRes.json();
            const subjectList = suggested.suggested_subjects || suggested.subjects || DEFAULT_SUBJECTS;
            setSuggestedSubjects(Array.isArray(subjectList) ? subjectList : DEFAULT_SUBJECTS);
          }
        } catch (err) {
          // Use default subjects if backend call fails
          setSuggestedSubjects(DEFAULT_SUBJECTS);
        }

        // Set initial selection to all suggested subjects
        setSelectedSubjects(suggestedSubjects);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load subjects');
        setSuggestedSubjects(DEFAULT_SUBJECTS);
        setSelectedSubjects(DEFAULT_SUBJECTS);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [profileId, jdId]);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

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

      const plan = await planResponse.json();

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
      }
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
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link href={`/profile/from-jd?jd_id=${jdId}`} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="text-lg font-semibold text-gray-900">Step 3: Select Topics</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Choose Interview Topics</CardTitle>
            <CardDescription>
              {company && `Based on the ${company} job description, we suggest these topics. Select which areas you want to focus on.`}
              {!company && 'Select the topics you want to practice for your interview.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Suggested Subjects Grid */}
              <div className="space-y-3">
                {suggestedSubjects.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => toggleSubject(subject)}
                    className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    {selectedSubjects.includes(subject) ? (
                      <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-300 flex-shrink-0" />
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{subject}</p>
                      <p className="text-sm text-gray-600">
                        {getSubjectDescription(subject)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Count */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  {selectedSubjects.length === 0
                    ? 'Select at least one topic'
                    : `${selectedSubjects.length} topic${selectedSubjects.length !== 1 ? 's' : ''} selected`}
                </p>
                {selectedSubjects.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedSubjects.map(subject => (
                      <Badge key={subject} variant="secondary">{subject}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <Link href={`/profile/from-jd?jd_id=${jdId}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    Back
                  </Button>
                </Link>
                <Button
                  onClick={handleGenerate}
                  disabled={generating || selectedSubjects.length === 0}
                  className="flex-1"
                >
                  {generating ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Generating Plan...
                    </>
                  ) : (
                    'Generate Interview Plan'
                  )}
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                This will create a personalized study plan based on the job description and your selected topics.
              </p>
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
        <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-gray-600">Loading subjects...</p>
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
