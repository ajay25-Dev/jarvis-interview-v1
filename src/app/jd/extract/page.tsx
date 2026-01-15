'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Copy, Check, Loader } from 'lucide-react';
import Link from 'next/link';
type TabType = 'paste' | 'upload';

export default function ExtractJDPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('paste');
  const [loading, setLoading] = useState(false);
  const [jdText, setJdText] = useState('');
  const [fileName, setFileName] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          setJdText(event.target.result);
          setActiveTab('paste');
          setError('');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdText.trim()) {
      setError('Please enter a job description');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: jdText,
          source_type: fileName ? 'upload' : 'paste',
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.details || 'Failed to upload JD');
      }

      const jdData = await response.json();
      
      router.push(`/profile/from-jd?jd_id=${jdData.id}`);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process job description');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyExample = () => {
    const example = `Senior Data Analyst

Location: San Francisco, CA (Hybrid)
Salary: $120,000 - $150,000

About the Role:
We're looking for a skilled Data Analyst to join our analytics team. You'll work with stakeholders across the organization to extract insights from our data and drive business decisions.

Responsibilities:
- Analyze large datasets to identify trends and patterns
- Create dashboards and visualizations
- Present findings to non-technical stakeholders
- Collaborate with engineers to implement solutions

Required Skills:
- 3+ years of data analysis experience
- Expert SQL and Python skills
- Experience with Tableau or Power BI
- Strong communication skills

Nice to Have:
- Machine learning experience
- Statistical analysis background
- AWS or GCP experience`;

    setJdText(example);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setActiveTab('paste');
    setError('');
  };

  const getTabClass = (tab: TabType) =>
    [
      'flex-1 rounded-2xl px-5 py-5 text-xs font-semibold uppercase tracking-[0.4em] transition duration-200',
      activeTab === tab
        ? 'bg-gradient-to-r rounded-[10px] from-indigo-500/90 via-emerald-400/80 to-sky-500/70 text-white shadow-[0_3px_15px_rgba(15,23,42,0.25)]'
        : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700',
    ].join(' ');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white text-slate-900 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.15),_transparent_60%)] opacity-80" />
        <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 bg-[radial-gradient(circle,_rgba(16,185,129,0.12),_transparent_80%)] opacity-70" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 space-y-10">
        <nav className="flex items-center justify-between rounded-[10px] border border-slate-200 bg-white/90 px-4 py-3 shadow-sm shadow-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-[10px] border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-indigo-400/80 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-sm font-semibold text-slate-900">Job Description Lab</p>
              <p className="text-[0.65rem] uppercase tracking-[0.45em] text-indigo-500/80">
                /jd/extract
              </p>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Professional extraction in seconds
          </p>
        </nav>

        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.45em] text-indigo-500/80">Jarvis intake</p>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Clean, confident JD insight in a single step
          </h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Paste, drag, or upload any job description and Jarvis instantly surfaces the role, company,
            skills, and location to inform the next steps in your prep workflow.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.05fr,0.95fr]">
          {/* <div className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-2xl shadow-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.5em] text-indigo-500/80">Confidence</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {detectionReady ? 'High' : 'Warming up'}
                </p>
                <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">
                  {detectionReady ? 'Pattern match 94%' : 'Waiting for text'}
                </p>
              </div>
              <span className="rounded-2xl border border-indigo-500/60 px-3 py-1 text-[0.6rem] uppercase tracking-[0.4em] text-indigo-600">
                {sourceLabel}
              </span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[0.6rem] uppercase tracking-[0.4em] text-indigo-500">Role</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{previewRole}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[0.6rem] uppercase tracking-[0.4em] text-indigo-500">Company</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{previewCompany}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[0.6rem] uppercase tracking-[0.4em] text-indigo-500">Location</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{previewLocation}</p>
              </div>
            </div>
            <p className="mt-6 text-sm text-slate-600">
              Jarvis compares this JD to thousands of past interviews so you start the next step with clean
              data—no manual copy/paste required.
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Upload large documents, paste clipped text, or drop in your freshest JD. The extractor adapts to
              PDFs, DOCX, and raw text alike.
            </p>
          </div> */}

          <Card className="overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-2xl shadow-slate-200">
            <CardHeader className="px-8 pt-8">
              <CardTitle className="text-2xl font-semibold text-slate-900">
                Step 1: Upload Job Description
              </CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Paste or upload the JD, then Jarvis will extract insights on company, level, and key skills so you
                can jump straight to profile personalization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center gap-2 rounded-[10px] bg-slate-100 p-1">
                  <button
                    style={{ padding: '13px 0px', fontWeight: 'bold', letterSpacing: '0.1em' }}
                    type="button"
                    onClick={() => setActiveTab('paste')}
                    className={getTabClass('paste')}
                  >
                    Paste Text
                  </button>
                  <button
                    style={{ padding: '13px 0px', fontWeight: 'bold', letterSpacing: '0.1em' }}
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={getTabClass('upload')}
                  >
                    Upload File
                  </button>
                </div>

                {activeTab === 'paste' && (
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Paste the job description here..."
                      value={jdText}
                      onChange={(e) => {
                        setJdText(e.target.value);
                        setError('');
                      }}
                      className="min-h-[210px] rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-900 placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-indigo-300 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-indigo-600 transition hover:border-indigo-500 hover:bg-indigo-50"
                      onClick={handleCopyExample}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Example Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Use Example
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {activeTab === 'upload' && (
                  <div className="space-y-4">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-indigo-400/70"
                    >
                      <Upload className="h-12 w-12 text-indigo-300" />
                      <p className="text-sm font-semibold text-slate-900">Click to upload or drag and drop</p>
                      <p className="text-xs text-slate-500">
                        PDF, DOCX, or TXT (Max 10MB)
                      </p>
                      {fileName && (
                        <p className="text-xs uppercase tracking-[0.3em] text-indigo-500/80">
                          Selected: {fileName}
                        </p>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}

                {error && (
                  <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !jdText.trim()}
                  className="w-full rounded-2xl px-4 py-3 text-xs font-semibold tracking-[0.1em] text-white shadow-[0_5px_95px_rgba(15,23,42,0.45)] transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:brightness-75"
                  style={{
                    padding: '25px 0px', fontSize: '15px', fontWeight: 'bold', background: 'linear-gradient(129deg, rgb(97, 95, 255), rgb(173, 70, 255))',
                  }}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader className="h-4 w-4 animate-spin text-white" />
                      Processing...
                    </div>
                  ) : (
                    'Extract & Continue'
                  )}
                </Button>

                <p className="text-center text-xs uppercase tracking-[0.1em] text-slate-700">
                  Your JD will be analyzed to surface the company, role, skills, and industry.
                </p>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
