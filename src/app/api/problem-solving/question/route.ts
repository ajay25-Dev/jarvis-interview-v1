import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SUPABASE_CONFIG_READY = Boolean(SUPABASE_URL && SUPABASE_KEY);

interface QuestionContent {
  hint?: string;
  business_context?: string;
  case_study_title?: string;
  case_study_description?: string;
  case_study_problem_statement?: string;
  dataset_context?: string;
}

interface QuestionRecord {
  id: string;
  text: string;
  difficulty?: string;
  topics?: string[];
  exercise_id?: number;
  question_number?: number;
  content?: QuestionContent;
}

interface CaseStudyWithQuestion {
  question_id: string;
  title?: string;
  description?: string;
  problem_statement?: string;
  business_problem?: string;
  case_study_context?: string;
  estimated_time_minutes?: number;
  difficulty?: string;
  topics?: string[];
  question?: QuestionRecord | null;
}

const supabase = SUPABASE_CONFIG_READY
  ? createClient(SUPABASE_URL!, SUPABASE_KEY!)
  : null;

export async function GET(request: NextRequest) {
  if (!SUPABASE_CONFIG_READY || !supabase) {
    return NextResponse.json(
      { error: 'Supabase configuration is missing' },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const planIdParam = url.searchParams.get('plan_id');
  const questionIdParam = url.searchParams.get('question_id');

  const resolvedPlanId = planIdParam ? parseInt(planIdParam, 10) : null;

  if (!questionIdParam) {
    return NextResponse.json(
      { error: 'question_id is required for problem solving practice' },
      { status: 400 },
    );
  }

  const { data: questionRecord, error: primaryError } = await supabase
    .from('interview_practice_questions')
    .select('*')
    .eq('id', questionIdParam)
    .maybeSingle();

  if (primaryError || !questionRecord) {
    return NextResponse.json(
      { error: 'Problem solving question not found' },
      { status: 404 },
    );
  }

  const { data: peerQuestions, error: peerError } = await supabase
    .from('interview_practice_questions')
    .select('*')
    .eq('exercise_id', questionRecord.exercise_id)
    .order('question_number', { ascending: true });

  if (peerError) {
    return NextResponse.json(
      { error: 'Failed to load related problem solving questions' },
      { status: 500 },
    );
  }

  const normalizeCaseStudy = (rec: QuestionRecord): CaseStudyWithQuestion => {
    const content = rec.content ?? {};
    return {
      question_id: rec.id,
      title: content.case_study_title ?? rec.text,
      description: content.case_study_description ?? content.business_context,
      problem_statement: content.case_study_problem_statement ?? content.business_context ?? rec.text,
      business_problem: content.business_context,
      case_study_context: content.dataset_context,
      estimated_time_minutes: undefined,
      difficulty: rec.difficulty,
      topics: rec.topics,
      question: rec as QuestionRecord,
    };
  };

  const caseStudies: CaseStudyWithQuestion[] = (peerQuestions ?? []).map(normalizeCaseStudy);

  return NextResponse.json({
    plan_id: resolvedPlanId,
    case_studies: caseStudies,
    current_question: questionRecord as QuestionRecord,
  });
}
