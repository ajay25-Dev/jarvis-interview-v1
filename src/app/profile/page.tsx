/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit2, Mail, Briefcase, Calendar, BarChart3, Zap } from 'lucide-react';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <span className="text-lg font-semibold text-gray-900">Profile</span>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">Loading profile...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <span className="text-lg font-semibold text-gray-900">My Profile</span>
          </div>
          {profile && (
            <Link href="/profile/create">
              <Button variant="outline" size="sm">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {profile ? (
          <div className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle>Interview Preparation Profile</CardTitle>
                <CardDescription>Your interview prep details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Target Role */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="w-5 h-5 text-gray-400" />
                        <p className="text-sm font-medium text-gray-600">Target Role</p>
                      </div>
                      <p className="text-2xl font-semibold text-gray-900">
                        {profile.target_role}
                      </p>
                    </div>

                    {/* Email */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <p className="text-sm font-medium text-gray-600">Email</p>
                      </div>
                      <p className="text-gray-900">{profile.email}</p>
                    </div>

                    {/* Experience Level */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-5 h-5 text-gray-400" />
                        <p className="text-sm font-medium text-gray-600">Experience Level</p>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {profile.experience_level}
                      </Badge>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Industry */}
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Industry</p>
                      <Badge variant="outline" className="capitalize">
                        {profile.industry}
                      </Badge>
                    </div>

                    {/* Company */}
                    {profile.company_name && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Company</p>
                        <p className="text-gray-900">{profile.company_name}</p>
                      </div>
                    )}

                    {/* Timeline */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <p className="text-sm font-medium text-gray-600">Timeline</p>
                      </div>
                      <p className="text-gray-900 font-semibold">
                        {profile.preparation_timeline_weeks} weeks
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills Card */}
            {profile.current_skills && profile.current_skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Current Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.current_skills.map((skill: string, idx: number) => (
                      <Badge key={idx}>{skill}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes Card */}
            {profile.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {profile.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  Back to Home
                </Button>
              </Link>
              <Link href="/jd/upload" className="flex-1">
                <Button className="w-full">
                  Upload Job Description
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Profile Created Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your interview preparation profile to get started.
              </p>
              <Link href="/profile/create">
                <Button>Create Profile</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
