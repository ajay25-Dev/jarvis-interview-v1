import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const DEFAULT_PLAN_PAGE_SIZE = 4;

interface PlanProfile {
  id: number;
  company_name?: string | null;
  target_role?: string | null;
  experience_level?: string | null;
}

interface PlanJobDescription {
  id: number;
  company_name?: string | null;
  role_title?: string | null;
  industry?: string | null;
}

interface PlanRecord {
  id: number;
  profile_id: number;
  jd_id: number;
  profile: PlanProfile | null;
  job_description: PlanJobDescription | null;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase configuration missing');
    return NextResponse.json(
      { error: 'Supabase configuration missing' },
      { status: 500 },
    );
  }

  const userId = request.headers.get('x-user-id') || DEMO_USER_ID;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get('limit') ?? DEFAULT_PLAN_PAGE_SIZE);
  const pageParam = Number(url.searchParams.get('page') ?? '1');
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 ? limitParam : DEFAULT_PLAN_PAGE_SIZE;
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  try {
    const fetchLimit = limit + 1;
    const rangeStart = (page - 1) * limit;
    const rangeEnd = rangeStart + fetchLimit - 1;
    const { data: plans, error } = await supabase
      .from('interview_prep_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(rangeStart, rangeEnd);

    if (error) throw error;

    const safePlans = Array.isArray(plans) ? plans : [];
    if (!safePlans.length) {
      return NextResponse.json({ plans: [], hasMore: false });
    }

    const profileIds = Array.from(
      new Set(
        safePlans
          .map((plan) => Number(plan.profile_id))
          .filter((id) => !Number.isNaN(id)),
      ),
    );

    const jdIds = Array.from(
      new Set(
        safePlans
          .map((plan) => Number(plan.jd_id))
          .filter((id) => !Number.isNaN(id)),
      ),
    );

    const profileMap = new Map<number, PlanProfile>();
    if (profileIds.length) {
      const { data: profiles, error: profileError } = await supabase
        .from('interview_profiles')
        .select('id, company_name, target_role, experience_level')
        .in('id', profileIds);

      if (profileError) {
        console.error('Error fetching profiles for plans:', profileError);
      } else if (profiles) {
        profiles.forEach((profile) => {
          const key = Number(profile?.id);
          if (!Number.isNaN(key)) {
            profileMap.set(key, profile);
          }
        });
      }
    }

    const jobDescriptionMap = new Map<number, PlanJobDescription>();
    if (jdIds.length) {
      const { data: jobDescriptions, error: jdError } = await supabase
        .from('interview_job_descriptions')
        .select('id, company_name, role_title, industry')
        .in('id', jdIds);

      if (jdError) {
        console.error('Error fetching job descriptions for plans:', jdError);
      } else if (jobDescriptions) {
        jobDescriptions.forEach((jd) => {
          const key = Number(jd?.id);
          if (!Number.isNaN(key)) {
            jobDescriptionMap.set(key, jd);
          }
        });
      }
    }

    const pagedPlans = safePlans.slice(0, limit);
    const enrichedPlans: PlanRecord[] = pagedPlans.map((plan) => ({
      ...plan,
      profile: profileMap.get(Number(plan.profile_id)) || null,
      job_description: jobDescriptionMap.get(Number(plan.jd_id)) || null,
    }));
    const hasMore = safePlans.length > limit;
    return NextResponse.json({ plans: enrichedPlans, hasMore });
  } catch (error) {
    console.error('Error fetching interview prep plans:', error);
    return NextResponse.json(
      { error: 'Failed to load plans' },
      { status: 500 },
    );
  }
}
