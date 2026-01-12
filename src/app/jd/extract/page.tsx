/* eslint-disable react/no-unescaped-entities */
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
            <CardTitle>Step 1: Upload Job Description</CardTitle>
            <CardDescription>
              Paste or upload the job description. We'll extract key information to customize your prep.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tabs */}
              <div className="flex gap-2 border-b">
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    activeTab === 'paste'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Paste Text
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    activeTab === 'upload'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Upload File
                </button>
              </div>

              {/* Paste Tab */}
              {activeTab === 'paste' && (
                <div className="space-y-4">
                  <Textarea
                    placeholder="Paste the job description here..."
                    value={jdText}
                    onChange={(e) => {
                      setJdText(e.target.value);
                      setError('');
                    }}
                    className="min-h-80"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleCopyExample}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Example Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Use Example
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="font-medium text-gray-900 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-600">
                      PDF, DOCX, or TXT files (Max 10MB)
                    </p>
                    {fileName && (
                      <p className="text-sm text-primary mt-2">
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

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !jdText.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Extract & Continue'
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Your job description will be analyzed to extract company, role level, required skills, and industry.
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
