import { Suspense } from 'react';
import PracticePageClient from './page-client';

export default function PracticePage() {
  return (
    <Suspense fallback={null}>
      <PracticePageClient />
    </Suspense>
  );
}
