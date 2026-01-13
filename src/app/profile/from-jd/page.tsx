/* eslint-disable react/no-unescaped-entities, @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader } from 'lucide-react';
import Link from 'next/link';

const EXPERIENCE_LEVELS = ['entry', 'junior', 'mid', 'senior', 'lead'];
const INDUSTRIES = ['tech', 'finance', 'healthcare', 'education', 'ecommerce', 'other'];
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  finance: ['finance', 'nbfc', 'lending', 'loan', 'credit', 'bank', 'payments', 'personal loan'],
  healthcare: ['healthcare', 'medical', 'hospital', 'pharma'],
  education: ['education', 'learning', 'edtech', 'school', 'university'],
  ecommerce: ['ecommerce', 'retail', 'shopping', 'commerce'],
  tech: ['tech', 'software', 'developer', 'engineer', 'cloud', 'data'],
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

function buildRoleFromExtract(extracted?: Record<string, any>) {
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

function buildCompanyFromExtract(extracted?: Record<string, any>) {
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

function buildLocationFromExtract(extracted: Record<string, any>) {
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

function parseRoleFromJDText(text?: string) {
  if (!text) return '';
  const firstLine = text.trim().split('\n')[0] || '';
  if (!firstLine) return '';
  const cleanedLine = firstLine.replace(/Job Title:/i, '').trim();
  const segments = cleanedLine
    .split(/[|–—-]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments[0] || '';
}

function parseCompanyFromJDText(text?: string) {
  if (!text) return '';
  const firstLine = text.trim().split('\n')[0] || '';
  const segments = firstLine
    .split(/[|–—-]/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length > 1) {
    return segments[1];
  }

  const matchAbout = text.match(/About\s+([\w\s&.,]+)/i);
  if (matchAbout) {
    return matchAbout[1].trim();
  }

  const matchCompany = text.match(/Company[:\s-]+([^\n]+)/i);
  if (matchCompany) {
    return matchCompany[1].trim();
  }

  return '';
}

function buildPreviewText(source?: string, maxWords = 60) {
  if (!source) return '';
  const normalized = source.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const words = normalized.split(' ');
  if (words.length <= maxWords) {
    return normalized;
  }
  return `${words.slice(0, maxWords).join(' ')}...`;
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

  const targetParagraph = paragraphs.length
    ? paragraphs[paragraphs.length - 1]
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
  return match ? match[1].trim().replace(/\.$/, '') : '';
}

function limitWords(text: string, maxWords = 60) {
  const words = text.split(' ').filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}...`;
}

function buildShortJDSummary(
  extracted?: Record<string, any>,
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
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [jdContent, setJdContent] = useState('');
  const [extractedDetails, setExtractedDetails] = useState<Record<string, any> | null>(null);

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
  const summaryLocation =
    (extractedDetails ? buildLocationFromExtract(extractedDetails) : '') || 'Not detected';

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
        setExtracting(true);
        const extractResponse = await fetch('/api/interview-prep/extract-jd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_description: jdText }),
        });

        if (!extractResponse.ok) {
          throw new Error('Failed to extract data from job description');
        }

        const extracted = await extractResponse.json();
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
        setExtracting(false);
      }
    };

    fetchAndExtract();
  }, [jdId]);

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
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Analyzing job description...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link href="/jd/extract" className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="text-lg font-semibold text-gray-900">Step 2: Create Profile</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Build Your Interview Profile</CardTitle>
            <CardDescription>
              We've extracted some information from the job description. Review and complete your profile.
            </CardDescription>
          </CardHeader>
      <CardContent>
        {extractedDetails && (
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Job snapshot
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryStat label="Role" value={summaryRole} />
              <SummaryStat label="Company" value={summaryCompany} />
              <SummaryStat label="Industry" value={summaryIndustry} />
              <SummaryStat label="Experience level" value={summaryExperience} />
              <SummaryStat label="Location" value={summaryLocation} />
            </div>
            {previewText && (
              <p className="mt-4 text-sm text-gray-600">
                <span className="font-semibold text-gray-900">Preview:</span>{' '}
                {previewText}
              </p>
            )}
            {conclusionText && (
              <p className="mt-3 text-sm text-gray-500">
                <span className="font-semibold text-gray-900">Conclusion:</span>{' '}
                {conclusionText}
              </p>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email & Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_role">Target Role *</Label>
                  <Input
                    id="target_role"
                    name="target_role"
                    placeholder="e.g., Senior Data Analyst"
                    value={formData.target_role}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Experience & Industry */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="experience_level">Experience Level</Label>
                  <select
                    id="experience_level"
                    name="experience_level"
                    value={formData.experience_level}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {EXPERIENCE_LEVELS.map(level => (
                      <option key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <select
                    id="industry"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>
                        {ind.charAt(0).toUpperCase() + ind.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Company & Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    placeholder="Company name"
                    value={formData.company_name}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preparation_timeline_weeks">Prep Timeline (weeks)</Label>
                  <Input
                    id="preparation_timeline_weeks"
                    name="preparation_timeline_weeks"
                    type="number"
                    min="1"
                    max="52"
                    value={formData.preparation_timeline_weeks}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <Label htmlFor="current_skills">Current Skills (comma-separated)</Label>
                <Textarea
                  id="current_skills"
                  name="current_skills"
                  placeholder="e.g., SQL, Python, Excel"
                  value={formData.current_skills}
                  onChange={handleChange}
                  className="min-h-20"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Any additional context..."
                  value={formData.notes}
                  onChange={handleChange}
                  className="min-h-20"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  'Continue to Subject Selection'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900 break-words">{value}</p>
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
