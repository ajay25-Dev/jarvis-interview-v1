'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader, CheckCircle } from 'lucide-react';
import Link from 'next/link';

function GeneratePlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Analyzing job description...');
  const [planId, setPlanId] = useState<number | null>(null);

  useEffect(() => {
    const generatePlan = async () => {
      try {
        const jdId = searchParams.get('jd_id');
        const profileId = searchParams.get('profile_id');

        if (!jdId || !profileId) {
          setStatus('error');
          setMessage('Missing profile or job description. Please start from the beginning.');
          return;
        }

        setMessage('Creating your personalized interview plan...');

        const response = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile_id: parseInt(profileId),
            jd_id: parseInt(jdId),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate plan');
        }

        const data = await response.json();
        setPlanId(data.id);
        setStatus('success');
        setMessage('Your interview prep plan is ready!');

        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/plan');
        }, 2000);
      } catch (error) {
        console.error('Error:', error);
        setStatus('error');
        setMessage('Failed to generate plan. Please try again.');
      }
    };

    generatePlan();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="text-lg font-semibold text-gray-900">
            Generate Interview Plan
          </span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              {status === 'loading' && (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                      <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Creating Your Plan
                  </h2>
                  <p className="text-gray-600 mb-8">{message}</p>

                  {/* Progress Steps */}
                  <div className="space-y-4 max-w-md mx-auto mb-8">
                    <Step
                      number={1}
                      label="Analyzing Job Description"
                      active
                    />
                    <Step number={2} label="Extracting Requirements" />
                    <Step number={3} label="Generating Personalized Plan" />
                  </div>

                  <p className="text-sm text-gray-500">
                    This usually takes a minute or two...
                  </p>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Plan Generated!
                  </h2>
                  <p className="text-gray-600 mb-8">{message}</p>
                  <p className="text-sm text-gray-500">
                    Redirecting to your interview plan...
                  </p>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">⚠️</span>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Something Went Wrong
                  </h2>
                  <p className="text-gray-600 mb-8">{message}</p>
                  <div className="flex gap-4 justify-center">
                    <Link href="/jd/upload">
                      <Button variant="outline">Try Again</Button>
                    </Link>
                    <Link href="/">
                      <Button>Go Home</Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function GeneratePlanLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function GeneratePlanPage() {
  return (
    <Suspense fallback={<GeneratePlanLoadingFallback />}>
      <GeneratePlanContent />
    </Suspense>
  );
}

function Step({
  number,
  label,
  active = false,
}: {
  number: number;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
          active
            ? 'bg-blue-100 text-blue-600'
            : 'bg-gray-100 text-gray-600'
        }`}
      >
        {number}
      </div>
      <span className={`text-sm font-medium ${
        active ? 'text-gray-900' : 'text-gray-600'
      }`}>
        {label}
      </span>
    </div>
  );
}
