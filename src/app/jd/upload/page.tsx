/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Copy, Check, Loader } from 'lucide-react';
import Link from 'next/link';

type TabType = 'paste' | 'upload';

function UploadJDContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams.get('profile_id');
  const [activeTab, setActiveTab] = useState<TabType>('paste');
  const [loading, setLoading] = useState(false);
  const [jdText, setJdText] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          setJdText(event.target.result);
          setActiveTab('paste');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdText.trim()) {
      alert('Please enter a job description');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const response = await fetch('/api/jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: jdText,
          source_type: fileName ? 'upload' : 'paste',
        }),
      });

      if (!response.ok) throw new Error('Failed to upload JD');

      const data = await response.json();
      setUploadProgress(100);

      // Short delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 500));

      router.push(`/plan/generate?profile_id=${profileId}&jd_id=${data.id}`);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to upload job description');
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="text-lg font-semibold text-gray-900">Upload Job Description</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Add Job Description</CardTitle>
            <CardDescription>
              Paste or upload the job description you're preparing for
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('paste')}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'paste'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Paste Text
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'upload'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Upload File
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Paste Tab */}
              {activeTab === 'paste' && (
                <div className="space-y-4">
                  <Textarea
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste your job description here..."
                    className="min-h-[400px] font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleCopyExample}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Example copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Use example JD
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Upload className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        Drop your file here or click to browse
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Supported: PDF, DOCX, TXT (max 10MB)
                      </p>
                    </div>
                  </div>
                  {fileName && (
                    <p className="mt-4 text-sm text-green-600 font-medium">
                      ✓ {fileName} selected
                    </p>
                  )}
                </div>
              )}

              {/* Display uploaded content preview */}
              {jdText && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Preview</p>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-[200px] overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {jdText.substring(0, 500)}
                      {jdText.length > 500 && '...'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {jdText.length} characters
                  </p>
                </div>
              )}

              {/* Progress bar */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    {uploadProgress}% uploaded
                  </p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-4 pt-6">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <button
                  type="submit"
                  disabled={loading || !jdText.trim()}
                  className="flex-1 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Uploading...' : 'Continue'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Include the full job description for best results</li>
              <li>• Our AI will analyze requirements and create a personalized plan</li>
              <li>• You can upload multiple job descriptions</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function UploadJDLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function UploadJDPage() {
  return (
    <Suspense fallback={<UploadJDLoadingFallback />}>
      <UploadJDContent />
    </Suspense>
  );
}
