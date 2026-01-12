import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Dataset, PracticeQuestionType, Question } from '@/components/practice/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
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

    const { data: exercise, error: exerciseError } = await supabase
      .from('interview_practice_exercises')
      .select('*')
      .eq('id', resolvedParams.exerciseId)
      .single();

    if (exerciseError || !exercise) {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 404 }
      );
    }

    const { data: questions, error: questionsError } = await supabase
      .from('interview_practice_questions')
      .select('*')
      .eq('exercise_id', resolvedParams.exerciseId)
      .order('question_number', { ascending: true });

    if (questionsError) {
      throw questionsError;
    }

    const { data: datasets, error: datasetsError } = await supabase
      .from('interview_practice_datasets')
      .select('*')
      .eq('exercise_id', resolvedParams.exerciseId);

    if (datasetsError) {
      throw datasetsError;
    }

    const formattedQuestions: Question[] = (questions || []).map((q) => ({
      id: q.id,
      exercise_id: q.exercise_id,
      text: q.text,
      type: (q.type as PracticeQuestionType) || 'python',
      language: q.language,
      difficulty: q.difficulty,
      topics: q.topics,
      points: q.points,
      order_index: q.question_number || 0,
      question_number: q.question_number,
      content: q.content,
      expected_output_table: q.expected_output_table,
    }));

    const formattedDatasets: Dataset[] = (datasets || []).map((ds) => ({
      id: ds.id,
      name: ds.name,
      description: ds.description,
      table_name: ds.table_name,
      columns: ds.columns,
      schema_info: ds.schema_info,
      creation_sql: ds.creation_sql,
      creation_python: ds.creation_python,
      dataset_csv_raw: ds.csv_data,
      record_count: ds.record_count,
      subject_type: ds.subject_type,
    }));

    return NextResponse.json({
      id: exercise.id,
      title: exercise.name,
      subject: exercise.name,
      description: exercise.description,
      type: 'sql',
      questions: formattedQuestions,
      questions_raw: formattedQuestions,
      datasets: formattedDatasets,
      created_at: exercise.created_at,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch exercise details',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
