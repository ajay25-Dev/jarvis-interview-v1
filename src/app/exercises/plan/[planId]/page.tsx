import { Suspense } from 'react';
import {
  ExercisesPageClient,
  ExercisesPageFallback,
} from '@/components/practice/ExercisesPageClient';

interface ExercisesPlanPageProps {
  params: Promise<{
    planId: string;
  }>;
}

export default async function ExercisesPlanPage({
  params,
}: ExercisesPlanPageProps) {
  const { planId } = await params;
  return (
    <Suspense fallback={<ExercisesPageFallback />}>
      <ExercisesPageClient planIdOverride={planId} />
    </Suspense>
  );
}
