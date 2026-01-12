import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const AI_SERVICE_URL_RAW =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
  process.env.NEXT_PUBLIC_AI_API_URL ||
  process.env.NEXT_PUBLIC_AI_URL ||
  'http://localhost:8000';
const AI_BASE_URL = AI_SERVICE_URL_RAW
  .replace(/\/mentor-chat\/?$/, '')
  .replace(/\/api\/?$/, '')
  .replace(/\/*$/, '');
const AI_FALLBACK_URL = 'http://localhost:8000';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseClient =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

type MentorChatApiPayload = {
  student_message?: string;
  context?: string;
  hypothesis?: string;
  target_questions?: string[];
  conversation_history?: Array<{ role: string; content: string; created_at?: string }>;
  identified_questions?: string[];
  exercise_title?: string;
  exercise_description?: string;
  exercise_questions?: string[];
  section_title?: string;
  section_overview?: string;
  guiding_prompt?: string;
  question_id?: string | number;
};

function buildAiPayload(body: MentorChatApiPayload) {
  return {
    context: body.context?.trim() || 'Problem Solving case context',
    hypothesis: body.hypothesis?.trim() || 'Problem Solving hypothesis',
    target_questions: Array.isArray(body.target_questions) ? body.target_questions : [],
    student_message: body.student_message?.trim() || '',
    conversation_history: Array.isArray(body.conversation_history)
      ? body.conversation_history
      : [],
    identified_questions: Array.isArray(body.identified_questions)
      ? body.identified_questions
      : [],
    exercise_title: body.exercise_title?.trim() || 'Problem Solving case study',
    exercise_description: body.exercise_description?.trim() || '',
    exercise_questions: Array.isArray(body.exercise_questions)
      ? body.exercise_questions
      : [],
    section_title: body.section_title?.trim() || 'Problem Solving',
    section_overview: body.section_overview?.trim() || '',
    guiding_prompt: body.guiding_prompt?.trim() || '',
  };
}

function resolveUserId(request: NextRequest) {
  const header = request.headers.get('x-user-id');
  if (header) {
    return header;
  }
  if (process.env.DEV_INTERVIEW_PREP_USER_ID) {
    return process.env.DEV_INTERVIEW_PREP_USER_ID;
  }
  return '00000000-0000-0000-0000-000000000000';
}

async function persistChatMessages(entries: Array<{
  user_id: string;
  question_id: string | null;
  role: 'student' | 'mentor';
  message: string;
  created_at: string;
}>) {
  if (!supabaseClient || entries.length === 0) {
    return;
  }
  try {
    await supabaseClient.from('interview_exercise_mentor_chat').insert(entries);
  } catch (error) {
    console.error('Unable to persist mentor chat entries:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MentorChatApiPayload;
    const payload = buildAiPayload(body);
    const userId = resolveUserId(request);
    const questionId =
      typeof body.question_id === 'string'
        ? body.question_id.trim() || null
        : typeof body.question_id === 'number' && Number.isFinite(body.question_id)
        ? String(body.question_id)
        : null;


    let response = await fetch(`${AI_BASE_URL}/mentor-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let responseText = await response.text();
    if (!response.ok) {
      // Try a local fallback if the configured host does not serve /mentor-chat
      if (response.status === 404 && AI_BASE_URL !== AI_FALLBACK_URL) {
        response = await fetch(`${AI_FALLBACK_URL}/mentor-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        responseText = await response.text();
        if (!response.ok) {
          console.error('Mentor chat proxy error (fallback):', response.status, responseText);
          return NextResponse.json(
            { error: responseText || 'AI mentor chat request failed' },
            { status: response.status },
          );
        }
      } else {
        console.error('Mentor chat proxy error:', response.status, responseText);
        return NextResponse.json(
          { error: responseText || 'AI mentor chat request failed' },
          { status: response.status },
        );
      }
    }

    const result = responseText ? JSON.parse(responseText) : { message: '' };

    const now = new Date().toISOString();
    const trimmedMessage = payload.student_message;
    const mentorMessage =
      typeof result?.message === 'string'
        ? result.message.trim()
        : 'I’m still digesting this scenario. Could you elaborate a bit more?';

    await persistChatMessages([
      {
        user_id: userId,
        question_id: questionId,
        role: 'student',
        message: trimmedMessage,
        created_at: now,
      },
      {
        user_id: userId,
        question_id: questionId,
        role: 'mentor',
        message: mentorMessage,
        created_at: now,
      },
    ]);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Mentor chat proxy unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = resolveUserId(request);
    const url = new URL(request.url);
    const questionIdParam = url.searchParams.get('question_id');

    if (!questionIdParam) {
      return NextResponse.json(
        { error: 'question_id is required' },
        { status: 400 },
      );
    }

    if (!supabaseClient) {
      return NextResponse.json(
        { error: 'Supabase client not configured' },
        { status: 500 },
      );
    }

    const { data, error } = await supabaseClient
      .from('interview_exercise_mentor_chat')
      .select('user_id, question_id, role, message, created_at')
      .eq('question_id', questionIdParam)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load mentor chat history:', error);
      return NextResponse.json(
        { error: 'Failed to load mentor chat history' },
        { status: 500 },
      );
    }

    return NextResponse.json({ messages: data ?? [] });
  } catch (error) {
    console.error('Mentor chat history unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
