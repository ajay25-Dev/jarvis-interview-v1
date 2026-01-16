import { Suspense } from 'react';
import {
  ExercisesPageClient,
  ExercisesPageFallback,
} from '@/components/practice/ExercisesPageClient';

export default function ExercisesPage() {
  return (
    <Suspense fallback={<ExercisesPageFallback />}>
      <ExercisesPageClient />
    </Suspense>
  );
}
