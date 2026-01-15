'use client';

import { useState, useEffect, Suspense, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from 'lucide-react';
import {
  parseCompanyFromJDText,
  parseLocationFromJDText,
  parseRoleFromJDText,
} from '@/lib/jd-utils';

const EXPERIENCE_LEVELS = ['entry', 'junior', 'mid', 'senior', 'lead'];
const INDUSTRIES = ['tech', 'finance', 'healthcare', 'education', 'ecommerce', 'other'];
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  finance: ['finance', 'nbfc', 'lending', 'loan', 'credit', 'bank', 'payments', 'personal loan'],
  healthcare: ['healthcare', 'medical', 'hospital', 'pharma'],
  education: ['education', 'learning', 'edtech', 'school', 'university'],
  ecommerce: ['ecommerce', 'retail', 'shopping', 'commerce'],
  tech: ['tech', 'software', 'developer', 'engineer', 'cloud', 'data'],
};

type ExtractedJDDetails = {
  role_title?: string;
  job_title?: string;
  title?: string;
  role?: string;
  position?: string;
  function?: string;
  company_name?: string;
  company?: string;
  organisation?: string;
  organization?: string;
  employer?: string;
  client?: string;
  location?: string | string[];
  locations?: string[];
  city?: string;
  cities?: string[];
  experience_level?: string;
  key_responsibilities?: string[];
  required_skills?: string[] | string;
  key_skills?: string[];
  skills?: string[];
  industry?: string;
  job_description?: string;
  [key: string]: string | string[] | undefined;
};

function normalizeExperienceLevel(raw?: string) {
  const lower = raw?.toLowerCase() || '';
  if (EXPERIENCE_LEVELS.includes(lower)) return lower;
  if (lower.includes('entry')) return 'entry';
  if (lower.includes('junior')) return 'junior';
  if (lower.includes('mid')) return 'mid';
  if (lower.includes('lead')) return 'lead';
  if (lower.includes('senior') || lower.includes('principal')) return 'senior';
  return 'junior';
}

function detectIndustryFromText(text?: string): string | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  return Object.entries(INDUSTRY_KEYWORDS).find(([, keywords]) =>
    keywords.some((keyword) => lower.includes(keyword)),
  )?.[0];
}

function normalizeIndustry(raw?: string, fallbackText?: string) {
  const value = raw?.trim().toLowerCase();
  if (value) {
    const match = INDUSTRIES.find((industry) => industry === value);
    if (match) return match;
    const detectedFromRaw = detectIndustryFromText(value);
    if (detectedFromRaw) return detectedFromRaw;
  }

  const detectedFromText = detectIndustryFromText(fallbackText);
  if (detectedFromText) return detectedFromText;

  return 'tech';
}

function buildRoleFromExtract(extracted?: ExtractedJDDetails) {
  if (!extracted) return '';
  return (
    extracted.role_title ||
    extracted.job_title ||
    extracted.title ||
    extracted.role ||
    extracted.position ||
    extracted.function ||
    ''
  );
}

function buildCompanyFromExtract(extracted?: ExtractedJDDetails) {
  if (!extracted) return '';
  return (
    extracted.company_name ||
    extracted.company ||
    extracted.organisation ||
    extracted.organization ||
    extracted.employer ||
    extracted.client ||
    ''
  );
}

function buildLocationFromExtract(extracted: ExtractedJDDetails) {
  const location = extracted.location || extracted.locations;
  if (Array.isArray(location)) {
    return location[0] || '';
  }
  return location || extracted.city || extracted.cities?.[0] || '';
}

function capitalizeWords(text?: string) {
  if (!text) return '';
  return text
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildSentencePreview(source?: string, maxSentences = 3, maxWords = 140) {
  if (!source) return '';
  const normalized = source.replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const sentenceMatches = normalized.match(/[^.!?]+[.!?]+/g) || [normalized];
  const summary = sentenceMatches.slice(0, maxSentences).join(' ').trim();
  if (!summary) return '';
  const words = summary.split(' ').filter(Boolean);
  if (words.length <= maxWords) return summary;
  return `${words.slice(0, maxWords).join(' ')}...`;
}

function buildConclusionText(source?: string, maxSentences = 2) {
  if (!source) return '';
  const normalized = source.replace(/\r/g, '').trim();
  if (!normalized) return '';

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const targetParagraph =
    paragraphs.length > 0
      ? paragraphs[paragraphs.length - 1] ?? normalized
      : normalized;

  const sentenceMatches =
    targetParagraph.match(/[^.!?]+[.!?]+/g) ||
    [targetParagraph];

  let conclusionSentences = sentenceMatches
    .slice(-maxSentences)
    .join(' ')
    .trim();

  if (!conclusionSentences) {
    const lines = normalized
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    conclusionSentences = lines.slice(-maxSentences).join(' ');
  }

  if (!conclusionSentences) return '';
  return limitWords(conclusionSentences, 60);
}

function extractFirstBulletLine(text?: string) {
  if (!text) return '';
  const match = text.match(/(?:•|-|\*)\s*([^\n]+)/m);
  const bullet = match?.[1];
  return bullet ? bullet.trim().replace(/\.$/, '') : '';
}

function limitWords(text: string, maxWords = 60) {
  const words = text.split(' ').filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}...`;
}

function buildShortJDSummary(
  extracted?: ExtractedJDDetails,
  source?: string,
) {
  const role = buildRoleFromExtract(extracted || undefined);
  const company = buildCompanyFromExtract(extracted || undefined);
  const location = extracted ? buildLocationFromExtract(extracted) : '';
  const experience = extracted?.experience_level;
  const responsibility =
    Array.isArray(extracted?.key_responsibilities) && extracted?.key_responsibilities[0]
      ? extracted.key_responsibilities[0]
      : extractFirstBulletLine(source);
  const skillValues = Array.isArray(extracted?.required_skills)
    ? extracted.required_skills
    : Array.isArray(extracted?.key_skills)
    ? extracted.key_skills
    : undefined;
  const skillList = skillValues
    ? skillValues.slice(0, 3).join(', ')
    : extracted?.required_skills ||
      extracted?.key_skills ||
      extracted?.skills ||
      '';

  const parts: string[] = [];
  if (role && company) {
    parts.push(`${role} at ${company}`);
  } else if (role) {
    parts.push(role);
  } else if (company) {
    parts.push(`Opportunity at ${company}`);
  }

  if (location) {
    parts.push(`Based in ${location}`);
  }
  if (experience) {
    parts.push(`${capitalizeWords(experience)} level experience`);
  }

  if (responsibility) {
    parts.push(`Focuses on ${responsibility}`);
  }
  if (skillList) {
    parts.push(`Skills: ${skillList}`);
  }

  const summary = parts.filter(Boolean).join('. ');
  if (!summary) {
    return '';
  }

  return limitWords(summary, 140);
}

function ProfileFromJDContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jdId = searchParams.get('jd_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jdContent, setJdContent] = useState('');
  const [extractedDetails, setExtractedDetails] = useState<ExtractedJDDetails | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    target_role: '',
    experience_level: 'junior',
    industry: 'tech',
    current_skills: '',
    preparation_timeline_weeks: 4,
    company_name: '',
    notes: '',
  });

  const previewSource = extractedDetails?.job_description || jdContent;
  const shortSummary = buildShortJDSummary(extractedDetails || undefined, previewSource);
  const previewText =
    shortSummary || buildSentencePreview(previewSource, 3, 140);
  const conclusionText = buildConclusionText(previewSource, 2);
  const parsedRoleFromPreview = parseRoleFromJDText(previewSource);
  const parsedCompanyFromPreview = parseCompanyFromJDText(previewSource);
  const summaryRole =
    extractedDetails?.role_title ||
    buildRoleFromExtract(extractedDetails || undefined) ||
    formData.target_role ||
    parsedRoleFromPreview ||
    'Not detected';
  const summaryCompany =
    buildCompanyFromExtract(extractedDetails || undefined) ||
    formData.company_name ||
    parsedCompanyFromPreview ||
    'Not detected';
  const summaryIndustry =
    capitalizeWords(extractedDetails?.industry || formData.industry) || 'Not detected';
  const summaryExperience =
    capitalizeWords(extractedDetails?.experience_level || formData.experience_level) || 'Not detected';
  const parsedLocation = parseLocationFromJDText(previewSource);
  const summaryLocation =
    (extractedDetails ? buildLocationFromExtract(extractedDetails) : '') ||
    parsedLocation ||
    'Not detected';

  // Fetch JD and extract data on mount
  useEffect(() => {
    const fetchAndExtract = async () => {
      if (!jdId) {
        setError('No job description provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch JD
        const jdResponse = await fetch(`/api/jd?id=${jdId}`);
        if (!jdResponse.ok) throw new Error('Failed to fetch job description');
        
        const jdData = await jdResponse.json();
        const jdText = Array.isArray(jdData) ? jdData[0]?.job_description : jdData?.job_description;
        
        if (!jdText) throw new Error('Job description not found');
        setJdContent(jdText);

        // Extract data from JD
        const extractResponse = await fetch('/api/interview-prep/extract-jd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_description: jdText }),
        });

        if (!extractResponse.ok) {
          throw new Error('Failed to extract data from job description');
        }

        const extracted = (await extractResponse.json()) as ExtractedJDDetails;
        setExtractedDetails(extracted);

        const fallbackRole = parseRoleFromJDText(jdText);
        const fallbackCompany = parseCompanyFromJDText(jdText);

        const extractedRole = buildRoleFromExtract(extracted);
        const extractedCompany = buildCompanyFromExtract(extracted);
        const extractedSkills = Array.isArray(extracted.required_skills)
          ? extracted.required_skills.join(', ')
          : extracted.required_skills || '';
        const notesFromJD = extracted.job_description
          ? `Extracted from JD: ${extracted.job_description.substring(0, 120)}...`
          : '';

        // Auto-fill form with extracted data
        setFormData(prev => ({
          ...prev,
          target_role: extractedRole || fallbackRole || prev.target_role,
          experience_level: normalizeExperienceLevel(extracted.experience_level),
          industry: normalizeIndustry(extracted.industry, jdText),
          current_skills: extractedSkills || prev.current_skills,
          company_name: extractedCompany || fallbackCompany || prev.company_name,
          notes: notesFromJD || prev.notes,
        }));
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to process job description');
      } finally {
        setLoading(false);
      }
    };

    fetchAndExtract();
  }, [jdId]);

  const fieldClasses =
    'w-full rounded-[10px] border border-gray-400 px-3 py-3 mt-2 text-base font-semibold text-grey outline-none transition duration-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50';
  const selectClasses =
    'w-full rounded-[10px] border border-gray-400 px-3 py-1.5 mt-2 text-base font-semibold text-grey outline-none transition duration-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50';
  const textareaClasses =
    'w-full rounded-[10px] border border-gray-400 px-3 py-3 mt-2 text-base font-semibold text-grey outline-none transition duration-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50';
  const snapshotGradientStyles: CSSProperties & Record<string, string> = {
    '--tw-gradient-via': 'oklch(0.72 0.13 234.98)',
    '--tw-gradient-via-stops':
      'var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), oklch(0.5 0.07 202.57) var(--tw-gradient-via-position), var(--tw-gradient-to) var(--tw-gradient-to-position)',
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'preparation_timeline_weeks' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!formData.target_role.trim()) {
      setError('Target role is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          current_skills: formData.current_skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) throw new Error('Failed to create profile');

      const data = await response.json();
      
      router.push(`/subjects/select?profile_id=${data.id}&jd_id=${jdId}`);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !jdContent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-500" />
          <p className="text-slate-600">Analyzing job description...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <header className="relative overflow-hidden">
        <div className="" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
          <div style={{ background: 'linear-gradient(90deg, #e9f8f3 0%, #f6fffc 50%, #ffffff 100%)' }} className="rounded-[10px] border border-slate-200 bg-white/90 p-6 shadow-lg shadow-indigo-200/50">
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Complete your profile</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">Tell us about you</h1>
            <p className="mt-2 text-sm text-slate-500">
              These insights help Jarvis personalize your interview prep so subjects, projects, and plans
              align with the JD.
            </p>
            {/* <div className="mt-6 rounded-full bg-slate-200/80 p-1">
              <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
                <span className="text-slate-900">Step 2 of 2</span>
                <span className="text-indigo-500">Profile complete</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500" />
              </div>
            </div> */}
          </div>

          <section className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-500">
            {['JD Insight', 'Snapshot', 'Profile', 'Subjects'].map((step, idx) => (
              <div
                key={step}
                className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-sm shadow-indigo-100"
              >
                <span
                  className={`flex h-3 w-3 items-center justify-center rounded-full border ${
                    idx <= 1 ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 bg-white'
                  }`}
                >
                  <span className="sr-only">{step}</span>
                </span>
                <span className={idx <= 1 ? 'text-indigo-500' : ''}>{step}</span>
              </div>
            ))}
          </section>
        </div>
      </header>

      <main className="mx-auto mt-[0px] max-w-6xl px-4 pb-16">
        <Card className="overflow-visible rounded-[10px] border border-white/20 bg-white shadow-lg shadow-indigo-200/40">
          <CardContent className="flex flex-col gap-6 px-6 pb-10 pt-6 lg:flex-row">
            <div className="flex-1 space-y-6 lg:max-w-lg">
            <div style={snapshotGradientStyles}
              className="flex flex-col gap-1 rounded-[10px] border-slate-900/40 bg-gradient-to-b from-slate-950/80 via-slate-900 to-slate-900/60 p-6 text-white shadow-[0_3px_5px_rgba(15,23,42,0.65)]"
            >

              <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-white/60">
                    Job Snapshot
                  </p>
                  <div className="flex items-center justify-between text-sm" style={{ margin: '0px 0px 20px 0px' }}>
                    <span className="font-medium text-white/70">Confidence: High</span>
                    <span className="font-semibold text-white">JD #{jdId || '—'}</span>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {extractedDetails ? (
                    <>
                      <SummaryStat label="Role" value={summaryRole} highlight />
                      <SummaryStat label="Company" value={summaryCompany} highlight />
                      <SummaryStat label="Industry" value={summaryIndustry} highlight />
                      <SummaryStat label="Experience" value={summaryExperience} highlight />
                      <SummaryStat label="Location" value={summaryLocation} highlight />
                    </>
                  ) : (
                    <div className="col-span-full flex justify-center">
                      <Loader className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
                {previewText && extractedDetails && (
                  <p className="text-sm text-white/85 pt-2" style={{ margin: '20px 0px 20px 0px' }}>
                    <span className="font-semibold text-white">Preview:</span> {previewText}
                  </p>
                )}
                {conclusionText && extractedDetails && (
                  <p className="text-sm text-white/80" style={{ margin: '0px 0px 20px 0px' }}>
                    <span className="font-semibold text-white">Conclusion:</span> {conclusionText}
                  </p>
                )}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{
                background: 'none',
              }}
              className="flex-1 space-y-6 rounded-[10px] border border-white/10 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/90 p-6 shadow-[0px_1px_12px_rgba(15,23,42,0.65)] backdrop-blur-xl"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-400 text-white" style={{ color: '#000' }}>
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={fieldClasses}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_role" className="text-white text-slate-400" style={{ color: '#000' }}>
                    Target Role
                  </Label>
                  <Input
                    id="target_role"
                    name="target_role"
                    placeholder="e.g., Senior Data Analyst"
                    value={formData.target_role}
                    onChange={handleChange}
                    required
                    className={fieldClasses}
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="experience_level" className="text-slate-400" style={{ color: '#000' }}>
                    Experience Level
                  </Label>
                  <select
                    id="experience_level"
                    name="experience_level"
                    value={formData.experience_level}
                    onChange={handleChange}
                    className={selectClasses}
                  >
                    {EXPERIENCE_LEVELS.map(level => (
                      <option key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-slate-400" style={{ color: '#000' }}>
                    Industry
                  </Label>
                  <select
                    id="industry"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className={selectClasses}
                  >
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>
                        {ind.charAt(0).toUpperCase() + ind.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="text-slate-400" style={{ color: '#000' }}>
                    Company
                  </Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    placeholder="Company name"
                    value={formData.company_name}
                    onChange={handleChange}
                    className={fieldClasses}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preparation_timeline_weeks" className="text-slate-400" style={{ color: '#000' }}>
                    Prep Timeline (weeks)
                  </Label>
                  <Input
                    id="preparation_timeline_weeks"
                    name="preparation_timeline_weeks"
                    type="number"
                    min="1"
                    max="52"
                    value={formData.preparation_timeline_weeks}
                    onChange={handleChange}
                    className={fieldClasses}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_skills" className="text-slate-400" style={{ color: '#000' }}>
                  Current Skills (comma-separated)
                </Label>
                <Textarea
                  id="current_skills"
                  name="current_skills"
                  placeholder="e.g., SQL, Python, Excel"
                  value={formData.current_skills}
                  onChange={handleChange}
                  className={textareaClasses}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-slate-400" style={{ color: '#000' }}>
                  Additional Notes
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Any additional context..."
                  value={formData.notes}
                  onChange={handleChange}
                  className={textareaClasses}
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-400/60 bg-red-50/80 p-4 text-sm text-red-700 shadow-lg shadow-red-500/20">
                  {error}
                </div>
              )}

              <Button
                style={{
                  background: 'linear-gradient(129deg, #615fff, #ad46ff)',
                  boxShadow: 'none',
                }}
                type="submit"
                disabled={loading}
                className="w-full rounded-[10px] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/40 transition hover:scale-[1.01] disabled:brightness-90"
              >
                {loading ? 'Creating Profile...' : 'Continue to Subject Selection'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
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
  return (
    <div className="rounded-3xl border border-white/5 bg-white/5 px-4 py-3">
      <p
        className={`text-[10px] uppercase tracking-[0.4em] ${
          highlight ? 'text-white/60' : 'text-slate-300'
        }`}
      >
        {label}
      </p>
      <p
        className={`text-sm font-semibold leading-snug ${
          highlight ? 'text-white' : 'text-slate-200'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ProfileFromJDLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function ProfileFromJDPage() {
  return (
    <Suspense fallback={<ProfileFromJDLoadingFallback />}>
      <ProfileFromJDContent />
    </Suspense>
  );
}
