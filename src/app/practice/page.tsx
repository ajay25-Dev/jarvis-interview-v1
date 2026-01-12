'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader, Code2, BookOpen, Search } from 'lucide-react';
import Link from 'next/link';
import { Question } from '@/components/practice/types';

interface ExerciseListItem {
  id: string;
  subject: string;
  title?: string;
  description?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  type?: string;
  questions?: Question[];
  questions_raw?: Question[];
  dataset_description?: string;
  created_at?: string;
}

export default function PracticePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/interview-prep/practice-exercises');
        if (!response.ok) {
          throw new Error('Failed to fetch exercises');
        }
        const data = await response.json();
        setExercises(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching exercises:', err);
        setError('Failed to load practice exercises. Please try again or check your internet connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, []);

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch =
      ex.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDifficulty = !selectedDifficulty || ex.difficulty === selectedDifficulty;

    return matchesSearch && matchesDifficulty;
  });

  const getDifficultyColor = (difficulty?: string) => {
    if (!difficulty) return 'bg-gray-100 text-gray-800';
    const lower = difficulty.toLowerCase();
    if (lower.includes('beginner') || lower.includes('easy')) return 'bg-green-100 text-green-800';
    if (lower.includes('intermediate') || lower.includes('medium')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getQuestionCount = (ex: ExerciseListItem) => {
    if (ex.questions?.length) return ex.questions.length;
    if (ex.questions_raw?.length) return ex.questions_raw.length;
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading practice exercises...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-lg font-semibold text-gray-900">Practice Exercises</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {exercises.length > 0 && (
          <div className="mb-8 space-y-4">
            <div className="flex gap-4 flex-col sm:flex-row">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search exercises..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <option value="">All Difficulties</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>
        )}

        {filteredExercises.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {exercises.length === 0 ? 'No Exercises Yet' : 'No Exercises Match Your Search'}
              </h3>
              <p className="text-gray-600 mb-6">
                {exercises.length === 0
                  ? 'Practice exercises will be generated when you create an interview plan.'
                  : 'Try adjusting your search filters.'}
              </p>
              {exercises.length === 0 && (
                <Link href="/plan">
                  <Button>Back to Plan</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredExercises.map((exercise) => (
              <Card
                key={exercise.id}
                className="hover:shadow-lg transition-shadow hover:border-primary cursor-pointer overflow-hidden"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Code2 className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="line-clamp-2">{exercise.title || exercise.subject}</span>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {getQuestionCount(exercise)} questions
                      </CardDescription>
                    </div>
                    {exercise.difficulty && (
                      <Badge className={getDifficultyColor(exercise.difficulty)}>
                        {exercise.difficulty}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {exercise.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{exercise.description}</p>
                  )}
                  {exercise.dataset_description && (
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      <span className="font-medium">Dataset:</span> {exercise.dataset_description.substring(0, 100)}...
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => router.push(`/practice/${exercise.id}`)}
                  >
                    View Exercise
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
