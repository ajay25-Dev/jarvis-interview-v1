import { PlanProgressClient } from './PlanProgressClient';

interface PlanProgressPageProps {
  params: Promise<{
    planId: string;
  }>;
}

export default async function PlanProgressPage({
  params,
}: PlanProgressPageProps) {
  const { planId } = await params;
  return <PlanProgressClient planId={planId} />;
}
