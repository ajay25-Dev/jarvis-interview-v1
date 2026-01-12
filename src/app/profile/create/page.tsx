'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const EXPERIENCE_LEVELS = ['entry', 'junior', 'mid', 'senior', 'lead'];
const INDUSTRIES = ['tech', 'finance', 'healthcare', 'education', 'ecommerce', 'other'];

export default function CreateProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    setLoading(true);

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
      router.push(`/jd/upload?profile_id=${data.id}`);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="text-lg font-semibold text-gray-900">Create Profile</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Interview Preparation Profile</CardTitle>
            <CardDescription>
              Tell us about yourself to get a personalized interview prep plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1: Email and Target Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
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
                  <Label htmlFor="target_role">Target Role</Label>
                  <Input
                    id="target_role"
                    name="target_role"
                    placeholder="e.g., Data Analyst, Software Engineer"
                    value={formData.target_role}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Row 2: Experience Level and Industry */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="experience_level">Experience Level</Label>
                  <select
                    id="experience_level"
                    name="experience_level"
                    value={formData.experience_level}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {EXPERIENCE_LEVELS.map((level) => (
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
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind.charAt(0).toUpperCase() + ind.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Company Name and Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name (Optional)</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    placeholder="e.g., Google, Microsoft"
                    value={formData.company_name}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preparation_timeline_weeks">
                    Preparation Timeline (weeks)
                  </Label>
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

              {/* Current Skills */}
              <div className="space-y-2">
                <Label htmlFor="current_skills">Current Skills (comma-separated)</Label>
                <Textarea
                  id="current_skills"
                  name="current_skills"
                  placeholder="e.g., SQL, Python, Data Analysis, PowerPoint"
                  value={formData.current_skills}
                  onChange={handleChange}
                  className="min-h-[100px]"
                />
                <p className="text-sm text-gray-500">
                  List your current skills separated by commas
                </p>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Anything else we should know about your background or goals?"
                  value={formData.notes}
                  onChange={handleChange}
                  className="min-h-[100px]"
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 pt-6">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Creating...' : 'Create Profile'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
