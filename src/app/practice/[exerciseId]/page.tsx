'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Loader,
  PlayCircle,
  BookOpen,
  Database,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { Dataset, Question } from '@/components/practice/types';

interface Exercise {
  id: string;
  subject: string;
  title?: string;
  description?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  type?: string;
  questions?: Question[];
  questions_raw?: Question[];
  dataset_description?: string;
  datasets?: Dataset[];
  created_at?: string;
}

export default function ExerciseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const exerciseId = params.exerciseId as string;

  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExercise = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/interview-prep/practice-exercises`);
        if (!response.ok) {
          throw new Error('Failed to fetch exercises');
        }
        const data = await response.json();
        const allExercises: Exercise[] = Array.isArray(data) ? data : [];
        const found = allExercises.find((ex) => ex.id === exerciseId);
        if (!found) {
          throw new Error('Exercise not found');
        }
        setExercise(found);
      } catch (err) {
        console.error('Error fetching exercise:', err);
        setError('Failed to load exercise details.');
      } finally {
        setLoading(false);
      }
    };

    if (exerciseId) {
      fetchExercise();
    }
  }, [exerciseId]);

  const getDifficultyColor = (difficulty?: string) => {
    if (!difficulty) return 'bg-gray-100 text-gray-800';
    const lower = difficulty.toLowerCase();
    if (lower.includes('beginner') || lower.includes('easy')) return 'bg-green-100 text-green-800';
    if (lower.includes('intermediate') || lower.includes('medium')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getQuestionColor = (difficulty?: string) => {
    if (!difficulty) return 'border-gray-200 hover:border-gray-300';
    const lower = difficulty.toLowerCase();
    if (lower.includes('beginner') || lower.includes('easy')) return 'border-green-200 hover:border-green-300';
    if (lower.includes('intermediate') || lower.includes('medium')) return 'border-yellow-200 hover:border-yellow-300';
    return 'border-red-200 hover:border-red-300';
  };

  const getQuestionList = () => {
    if (!exercise) return [];
    return (exercise.questions || exercise.questions_raw || []).sort((a, b) => {
      const aIdx = a.order_index ?? 0;
      const bIdx = b.order_index ?? 0;
      return aIdx - bIdx;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading exercise details...</p>
        </div>
      </div>
    );
  }

  if (!exercise || error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-lg font-semibold text-gray-900">Exercise Details</span>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Error Loading Exercise</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const questions = getQuestionList();
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">{exercise.title || exercise.subject}</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6">
          {/* Exercise Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{exercise.title || exercise.subject}</CardTitle>
                  {exercise.description && (
                    <CardDescription className="text-base">{exercise.description}</CardDescription>
                  )}
                </div>
                {exercise.difficulty && (
                  <Badge className={getDifficultyColor(exercise.difficulty)}>
                    {exercise.difficulty}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span>{questions.length} Questions</span>
                </div>
                {totalPoints > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>{totalPoints} Points</span>
                  </div>
                )}
                {exercise.type && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-primary font-medium">{exercise.type}</span>
                  </div>
                )}
              </div>

              {exercise.dataset_description && (
                <div className="border-t pt-4">
                  <div className="flex items-start gap-2">
                    <Database className="w-4 h-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Dataset</p>
                      <p className="text-sm text-gray-600 mt-1">{exercise.dataset_description}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Questions List */}
          {questions.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Questions</h2>
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <Card
                    key={question.id}
                    className={`border-2 transition-all hover:shadow-md cursor-pointer ${getQuestionColor(
                      question.difficulty
                    )}`}
                    onClick={() => router.push(`/practice/${exerciseId}/question/${question.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-semibold flex-shrink-0">
                              {index + 1}
                            </span>
                            <h3 className="font-medium text-gray-900 truncate">{question.text.substring(0, 80)}</h3>
                          </div>
                          <div className="flex flex-wrap gap-2 ml-9">
                            {question.difficulty && (
                              <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                                {question.difficulty}
                              </Badge>
                            )}
                            {question.type && (
                              <Badge variant="secondary" className="text-xs">
                                {question.type}
                              </Badge>
                            )}
                            {question.points && (
                              <Badge variant="outline" className="text-xs">
                                {question.points} pts
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Start Button */}
          {questions.length > 0 && (
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                const firstQuestion = questions[0];
                if (!firstQuestion) return;
                router.push(`/practice/${exerciseId}/question/${firstQuestion.id}`);
              }}
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              Start Exercise
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
