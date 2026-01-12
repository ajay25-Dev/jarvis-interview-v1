import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Dataset } from '@/components/practice/types';

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

    const { data: datasets, error } = await supabase
      .from('interview_practice_datasets')
      .select('*')
      .or(
        `exercise_id.eq.${resolvedParams.exerciseId},and(question_id.eq.${resolvedParams.questionId})`
      );

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch datasets' },
        { status: 500 }
      );
    }

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
      datasets: formattedDatasets,
      count: formattedDatasets.length,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch datasets',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
