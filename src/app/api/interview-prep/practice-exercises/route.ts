import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { JsonObject, JsonValue } from '@/components/practice/types';

type PlanQuestionData = Record<string, JsonValue | undefined>;

interface PlanCaseStudy {
  case_study?: string;
  description?: string;
  overview?: string;
  dataset_overview?: string;
  dataset_name?: string;
  dataset_schema?: JsonValue;
  dataset_creation_sql?: string;
  sample_data?: JsonValue;
  questions?: PlanQuestionData[];
  business_context?: string;
}

interface PlanSubjectData {
  subject?: string;
  business_context?: string;
  data_creation_sql?: string;
  dataset_creation_sql?: string;
  dataset_description?: string;
  case_studies?: PlanCaseStudy[];
  questions_raw?: PlanQuestionData[];
}

interface PlanRecord {
  id: number;
  plan_content?: {
    subject_prep?: Record<string, PlanSubjectData>;
  };
  created_at?: string;
}

const toString = (value?: JsonValue) => (typeof value === 'string' ? value : '');

const toStringArray = (value?: JsonValue) => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
};

const normalizeDataRows = (value?: JsonValue): JsonObject[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is JsonObject => typeof item === 'object' && item !== null);
  }
  if (typeof value === 'object' && value !== null) {
    return [value as JsonObject];
  }
  return [];
};

const splitCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const parseCsvSampleData = (
  value?: JsonValue,
): { rows: JsonObject[]; columns: string[] } => {
  if (!value || typeof value !== 'string') {
    return { rows: [], columns: [] };
  }

  const normalized = value.replace(/\r\n/g, '\n');
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const sanitizedLines = lines.filter((line) => {
    const trimmedLine = line.trim();
    return (
      trimmedLine.length > 0 &&
      !trimmedLine.startsWith('//') &&
      !trimmedLine.startsWith('--') &&
      !trimmedLine.startsWith('#')
    );
  });

  if (sanitizedLines.length === 0) {
    return { rows: [], columns: [] };
  }

  const headerLine = sanitizedLines[0];
  if (!headerLine) {
    return { rows: [], columns: [] };
  }

  const headers = splitCsvLine(headerLine).map((header, idx) =>
    header.length > 0 ? header : `column_${idx + 1}`,
  );

  if (headers.length === 0 || sanitizedLines.length === 1) {
    return { rows: [], columns: [] };
  }

  const rows = sanitizedLines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: JsonObject = {};
    headers.forEach((header, idx) => {
      row[header] = cells[idx] ?? '';
    });
    return row;
  });

  return { rows, columns: headers };
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Helper function to map subject names to question types
function getQuestionTypeFromSubject(subject: string): string {
  const subjectLower = subject.toLowerCase();
  
  // Map common subjects to their corresponding question types
  const subjectToTypeMap: Record<string, string> = {
    'sql': 'sql',
    'python': 'python',
    'javascript': 'javascript',
    'google sheets': 'google_sheets',
    'google sheet': 'google_sheets',
    'statistics': 'statistics',
    'power bi': 'power_bi',
    'math': 'math',
    'geometry': 'geometry',
    'coding': 'coding',
    'programming': 'coding',
    'reasoning': 'reasoning',
    'problem solving': 'problem_solving'
  };
  
  // Return mapped type or default to 'coding' for general programming
  return subjectToTypeMap[subjectLower] || 'coding';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const planId = searchParams.get('plan_id');
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '50';

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 1. Try to fetch from interview_practice_exercises
    let query = supabase
      .from('interview_practice_exercises')
      .select('*');

    if (subject) {
      query = query.ilike('name', `%${subject}%`);
    }
    if (planId) {
      query = query.ilike('name', `%Plan ${planId}%`);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { data: exercises, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) {
      console.error('Error fetching exercises:', error);
      // Don't throw, try fallback
    }

    const result = [];
    
    // Process existing exercises if found
    if (exercises && exercises.length > 0) {
      for (const exercise of exercises) {
        const { data: questions, error: questionsError } = await supabase
          .from('interview_practice_questions')
          .select('*')
          .eq('exercise_id', exercise.id)
          .order('question_number', { ascending: true });

        if (questionsError) {
          console.error(`Error fetching questions for exercise ${exercise.id}:`, questionsError);
        }

        const { data: datasets, error: datasetsError } = await supabase
          .from('interview_practice_datasets')
          .select('*')
          .eq('exercise_id', exercise.id);

        if (datasetsError) {
          console.error(`Error fetching datasets for exercise ${exercise.id}:`, datasetsError);
        }

        result.push({
          id: exercise.id,
          subject: exercise.name,
          title: exercise.name,
          description: exercise.description,
          created_at: exercise.created_at,
          questions: questions || [],
          dataset_description: datasets?.[0]?.description,
          datasets: datasets || [],
          business_context: exercise.description,
          data_creation_sql: exercise.data_creation_sql,
        });
      }
    }

    // 2. Fallback: If no exercises found (or to supplement), fetch from interview_prep_plans
    if (result.length === 0) {
      let plan: PlanRecord | null = null;
      if (planId) {
        const { data: planById, error: planByIdError } = await supabase
          .from('interview_prep_plans')
          .select('*')
          .eq('id', parseInt(planId, 10))
          .maybeSingle();
        if (planByIdError) {
          console.error(`Error fetching plan ${planId}:`, planByIdError);
        } else if (planById) {
          plan = planById;
        }
      }

      if (!plan) {
        const fallbackUserId =
          request.headers.get('x-user-id') || '550e8400-e29b-41d4-a716-446655440000';
        const { data: plans, error: plansError } = await supabase
          .from('interview_prep_plans')
          .select('*')
          .eq('user_id', fallbackUserId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (plansError) {
          console.error('Error fetching plans:', plansError);
        } else if (plans && plans.length > 0) {
          plan = plans[0];
        }
      }

      if (!plan) {
        console.error('No plan found for practice exercises fallback');
      } else {
        const subjectPrep: Record<string, PlanSubjectData> = plan.plan_content?.subject_prep || {};

        Object.entries(subjectPrep).forEach(([subjectKey, subjectData]) => {
          const subjectName =
            typeof subjectData?.subject === 'string' ? subjectData.subject : subjectKey;
          if (!subjectName) {
            return;
          }
          if (subject && !subjectName.toLowerCase().includes(subject.toLowerCase())) {
            return;
          }

          let allQuestions: PlanQuestionData[] = [];
          const datasets: JsonObject[] = [];
          const subjectBusinessContext = subjectData.business_context;

          subjectData.case_studies?.forEach((cs, idx) => {
            if (!cs) {
              return;
            }

            const datasetDescription =
              cs.case_study || cs.description || cs.overview || cs.dataset_overview;

            const questionsWithContext =
              cs.questions?.map((q) => ({
                ...q,
                business_context: subjectBusinessContext,
                case_study_context: datasetDescription,
              })) ?? [];

            if (questionsWithContext.length > 0) {
              allQuestions = [...allQuestions, ...questionsWithContext];
            }

            if (cs.dataset_schema || cs.dataset_creation_sql || cs.sample_data) {
              const datasetSubjectType = subjectName.toLowerCase();

              if (typeof cs.dataset_schema === 'string' && /CREATE\s+TABLE/i.test(cs.dataset_schema)) {
                const createTableRegex =
                  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?([\w$]+)["'`]?\s*\(([\s\S]*?)\);/gim;
                let match;
                let tableIndex = 0;

                const extractColumnsFromSql = (sqlColumns: string) => {
                  const cols: string[] = [];
                  let current = '';
                  let parenDepth = 0;
                  for (const char of sqlColumns) {
                    if (char === '(') parenDepth++;
                    else if (char === ')') parenDepth--;
                    if (char === ',' && parenDepth === 0) {
                      const columnSegment = current.trim().split(/\s+/)[0] ?? '';
                      const colName = columnSegment.replace(/['"`]/g, '');
                      if (
                        colName &&
                        !['PRIMARY', 'FOREIGN', 'KEY', 'CONSTRAINT', 'UNIQUE', 'CHECK'].includes(
                          colName.toUpperCase(),
                        )
                      ) {
                        cols.push(colName);
                      }
                      current = '';
                    } else {
                      current += char;
                    }
                  }
                  if (current.trim()) {
                    const columnSegment = current.trim().split(/\s+/)[0] ?? '';
                    const colName = columnSegment.replace(/['"`]/g, '');
                    if (
                      colName &&
                      !['PRIMARY', 'FOREIGN', 'KEY', 'CONSTRAINT', 'UNIQUE', 'CHECK'].includes(
                        colName.toUpperCase(),
                      )
                    ) {
                      cols.push(colName);
                    }
                  }
                  return cols;
                };

                while ((match = createTableRegex.exec(cs.dataset_schema)) !== null) {
                  const tableName = match[1] ?? '';
                  const columnDef = match[2] ?? '';
                  const columns = extractColumnsFromSql(columnDef);
                  const creationSql =
                    tableIndex === 0 ? `${cs.dataset_schema}\n\n${cs.sample_data ?? ''}` : undefined;

                  datasets.push({
                    id: `ds-${plan.id}-${subjectName}-${idx}-${tableIndex}`,
                    name: tableName,
                    description:
                      tableIndex === 0
                        ? datasetDescription || 'Dataset for case study'
                        : undefined,
                    table_name: tableName,
                    columns,
                    creation_sql: creationSql,
                    data: [],
                    subject_type: datasetSubjectType,
                  });
                  tableIndex++;
                }

                if (tableIndex === 0) {
                  const tableName = cs.dataset_name || `dataset_${idx + 1}`;
                  datasets.push({
                    id: `ds-${plan.id}-${subjectName}-${idx}`,
                    name: cs.dataset_name || `Dataset ${idx + 1}`,
                    description: datasetDescription || 'Dataset for case study',
                    table_name: tableName,
                    columns: [],
                    creation_sql: `${cs.dataset_schema ?? ''}\n\n${cs.sample_data ?? ''}`,
                    data: [],
                    subject_type: datasetSubjectType,
                  });
                }
              } else {
                const tableName = cs.dataset_name || `dataset_${idx + 1}`;
                const schemaColumns =
                  Array.isArray(cs.dataset_schema) &&
                  cs.dataset_schema.every((col) => typeof col === 'string')
                    ? (cs.dataset_schema as string[])
                    : typeof cs.dataset_schema === 'object' && cs.dataset_schema !== null
                      ? Object.keys(cs.dataset_schema as JsonObject)
                      : [];
                const parsedSampleData = parseCsvSampleData(cs.sample_data);
                let columns =
                  parsedSampleData.columns.length > 0
                    ? parsedSampleData.columns
                    : schemaColumns;
                const dataRows =
                  parsedSampleData.rows.length > 0
                    ? parsedSampleData.rows
                    : normalizeDataRows(cs.sample_data);

                if (columns.length === 0 && dataRows.length > 0) {
                  const [firstRow] = dataRows;
                  if (firstRow) {
                    columns = Object.keys(firstRow);
                  }
                }

                datasets.push({
                  id: `ds-${plan.id}-${subjectName}-${idx}`,
                  name: cs.dataset_name || `Dataset ${idx + 1}`,
                  description: datasetDescription || 'Dataset for case study',
                  table_name: tableName,
                  columns,
                  creation_sql: cs.dataset_creation_sql,
                  data: dataRows,
                  dataset_rows: dataRows,
                  dataset_columns: columns,
                  dataset_csv_raw:
                    typeof cs.sample_data === 'string' ? cs.sample_data : undefined,
                  subject_type: datasetSubjectType,
                });
              }
            }
          });

          const rawQuestions = subjectData.questions_raw ?? [];
          if (allQuestions.length === 0 && rawQuestions.length > 0) {
            const normalizedRawQuestions = rawQuestions.map((question, idx) => {
              const questionText = toString(
                question.business_question ??
                  question.question ??
                  question.text ??
                  question.prompt ??
                  question.title,
              );
              const expectedApproach = toString(
                question.expected_approach ?? question.hint ?? question.expected_answer,
              );
              const sampleOutput = toString(
                question.sample_output ??
                  question.answer ??
                  question.answer_sql ??
                  question.expected_answer,
              );
              const topics = toStringArray(question.topics);
              const normalizedTopics = topics.length > 0 ? topics : [subjectName];

              return {
                id: `raw-${plan.id}-${subjectName}-${idx}`,
                question: questionText,
                difficulty: toString(question.difficulty) || 'Intermediate',
                topics: normalizedTopics,
                expected_approach: expectedApproach,
                sample_output: sampleOutput,
                case_study_context: toString(question.case_study_context ?? question.context),
                hint: toString(question.hint ?? expectedApproach),
                business_context:
                  toString(question.business_context) || subjectBusinessContext,
              } as PlanQuestionData;
            });

            allQuestions = [...allQuestions, ...normalizedRawQuestions];
          }

          if (allQuestions.length > 0) {
            result.push({
              id: `plan-${plan.id}-${subjectName}`,
              subject: subjectName,
              title: `${subjectName} Practice`,
              description: `Practice exercises for ${subjectName} from your plan`,
              created_at: plan.created_at,
              questions: allQuestions.map((q, idx) => ({
                id: `q-${idx}`,
                text: q.question,
                difficulty: q.difficulty,
                topics: [subjectName],
                expected_answer: q.sample_output || q.expected_approach,
                hint: q.expected_approach,
                type: getQuestionTypeFromSubject(subjectName),
                points: 10,
                case_study_context: q.case_study_context,
                business_context:
                  q.business_context ||
                  subjectData.business_context ||
                  subjectData.case_studies?.[0]?.business_context,
              })),
              dataset_description:
                subjectData.case_studies?.[0]?.dataset_overview ||
                subjectData.dataset_description,
              datasets,
              business_context:
                subjectData.business_context ||
                subjectData.case_studies?.[0]?.business_context ||
                subjectData.case_studies?.[0]?.description,
              data_creation_sql:
                subjectData.data_creation_sql || subjectData.dataset_creation_sql,
            });
          }
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch practice exercises',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.profile_id || !body.jd_id || (!body.subject && !body.subjects)) {
      return NextResponse.json(
        { error: 'profile_id, jd_id, and subject(s) are required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${API_BASE}/interview-prep/practice-exercises/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(request.headers.get('authorization')
            ? { Authorization: request.headers.get('authorization')! }
            : {}),
          ...(request.headers.get('x-user-id')
            ? { 'x-user-id': request.headers.get('x-user-id')! }
            : {}),
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend returned ${response.status}:`, errorText);
      throw new Error(`Backend returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate practice exercises',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
