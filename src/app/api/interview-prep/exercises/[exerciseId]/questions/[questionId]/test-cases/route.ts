import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TestCase } from '@/components/practice/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string; questionId: string }> }
) {
  const resolvedParams = await params;
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: testCases, error } = await supabase
      .from('interview_practice_test_cases')
      .select('*')
      .eq('question_id', resolvedParams.questionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch test cases' },
        { status: 500 }
      );
    }

    const formattedTestCases = (testCases || []).map((tc: TestCase) => ({
      id: tc.id,
      input: tc.input,
      expected_output: tc.expected_output,
      is_hidden: tc.is_hidden || false,
      points: tc.points,
    }));

    return NextResponse.json(formattedTestCases);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch test cases',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
