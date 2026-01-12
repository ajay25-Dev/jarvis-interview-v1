/* eslint-disable react/no-unescaped-entities, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight,
  FileText,
  Target,
  Brain,
  Clock,
  CheckCircle,
  Plus,
  Code2,
} from 'lucide-react';
import Link from 'next/link';

interface Profile {
  id?: number;
  target_role?: string;
  experience_level?: string;
  company_name?: string;
  email?: string;
  preparation_timeline_weeks?: number;
}

interface Plan {
  id?: number;
  plan_content?: any;
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await fetch('/api/profile').catch(() => null);
        const planRes = await fetch('/api/plan').catch(() => null);

        if (profileRes?.ok) setProfile(await profileRes.json());
        if (planRes?.ok) setPlan(await planRes.json());
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">J</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">Jarvis Interview Prep</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/profile">
              <Button variant="ghost">Profile</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Interview Prep
          </h1>
          <p className="text-lg text-gray-600">
            Get AI-powered guidance for your next interview
          </p>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-primary/30 bg-primary/5 hover:border-primary transition-colors md:col-span-2 md:row-span-2">
            <CardContent className="pt-6 text-left h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-primary/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-gray-900">Upload Job Description</h3>
                    <p className="text-sm text-gray-600">Start here - we&apos;ll extract key info</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-6">
                  Share the job description and we&apos;ll automatically extract the company, experience level, required skills, and industry to pre-fill your profile.
                </p>
              </div>
              <Link href="/jd/extract">
                <Button className="w-full">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-dashed border-gray-300 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">View Plan</h3>
              <p className="text-sm text-gray-600 mb-4">
                See your personalized interview plan
              </p>
              <Link href="/plan">
                <Button className="w-full" disabled={!plan}>
                  View
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-dashed border-gray-300 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Code2 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Practice Exercises</h3>
              <p className="text-sm text-gray-600 mb-4">
                Generated exercises by subject
              </p>
              <Link href="/exercises">
                <Button variant="outline" className="w-full">Browse</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-dashed border-gray-300 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Create Profile</h3>
              <p className="text-sm text-gray-600 mb-4">
                Manual profile creation
              </p>
              <Link href="/profile/create">
                <Button variant="outline" className="w-full">Create</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Status */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Profile</CardTitle>
                <CardDescription>Interview preparation status</CardDescription>
              </CardHeader>
              <CardContent>
                {profile ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Role: {profile.target_role}
                        </span>
                      </div>
                      <Badge variant="secondary" className="w-full justify-center">
                        {profile.experience_level}
                      </Badge>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-600 mb-2">Timeline</p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">
                          {profile.preparation_timeline_weeks} weeks
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Create a profile to get started
                    </p>
                    <Link href="/profile/create">
                      <Button className="w-full" size="sm">
                        Create Profile
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Interview Plan Overview */}
          <div className="lg:col-span-2">
            {plan ? (
              <Card>
                <CardHeader>
                  <CardTitle>Your Interview Plan</CardTitle>
                  <CardDescription>
                    Personalized preparation roadmap
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Domains */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Focus Areas
                      </h4>
                      <div className="space-y-3">
                        {plan.plan_content?.domains?.slice(0, 3).map(
                          (domain: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900">
                                    {domain.title}
                                  </h5>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {domain.description}
                                  </p>
                                </div>
                                <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Estimated Hours */}
                    {plan.plan_content?.estimated_hours && (
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Estimated Time
                          </span>
                          <span className="font-semibold text-gray-900">
                            {plan.plan_content.estimated_hours} hours
                          </span>
                        </div>
                        <Progress
                          value={45}
                          className="mt-2"
                        />
                      </div>
                    )}

                    <Link href="/plan">
                      <Button className="w-full mt-4">
                        View Full Plan <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Plan Yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Upload a job description and we'll create a personalized
                      interview prep plan for you.
                    </p>
                    <Link href="/jd/upload">
                      <Button>Upload Job Description</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">AI Analysis</h3>
            <p className="text-sm text-gray-600">
              Get deep insights into job requirements
            </p>
          </div>

          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Focused Plan</h3>
            <p className="text-sm text-gray-600">
              Personalized prep roadmap for your role
            </p>
          </div>

          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Case Studies</h3>
            <p className="text-sm text-gray-600">
              Real-world scenarios for practice
            </p>
          </div>

          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Time Based</h3>
            <p className="text-sm text-gray-600">
              Structured timeline for preparation
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
