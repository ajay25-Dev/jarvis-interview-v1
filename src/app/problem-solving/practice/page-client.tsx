'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { MentorChat } from '@/components/practice/mentor-chat';

interface ProblemSolvingCaseStudy {
  question_id: string;
  title?: string;
  description?: string;
  problem_statement?: string;
  business_problem?: string;
  case_study_context?: string;
  estimated_time_minutes?: number;
  difficulty?: string;
  topics?: string[];
}

interface QuestionRecord {
  id: string;
  text: string;
  difficulty?: string;
  topics?: string[];
  content?: {
    hint?: string;
    business_context?: string;
  };
}

interface ProblemSolvingResponse {
  plan_id: number;
  case_studies: ProblemSolvingCaseStudy[];
  current_question?: QuestionRecord;
}

export default function ProblemSolvingPracticePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const planId = searchParams?.get('plan_id');
  const exerciseIdParam = searchParams?.get('exercise_id');
  const questionIdParam = searchParams?.get('question_id');
  const [caseStudies, setCaseStudies] = useState<ProblemSolvingCaseStudy[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  type MentorChatMessage = { role: 'student' | 'mentor'; content: string; created_at?: string };

  const [conversationHistory, setConversationHistory] = useState<MentorChatMessage[]>([]);
  const [identifiedQuestions, setIdentifiedQuestions] = useState<string[]>([]);

  type MentorChatHistoryMessage = {
    role?: string;
    message?: string;
    created_at?: string;
  };

  const updateQuery = (questionId: string) => {
    const params = new URLSearchParams();
    if (planId) params.set('plan_id', planId);
    if (exerciseIdParam) params.set('exercise_id', exerciseIdParam);
    if (questionId) params.set('question_id', questionId);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`);
  };

  const fetchCaseStudies = async () => {
    if (!planId && !questionIdParam) {
      setCaseStudies([]);
      setCurrentQuestion(null);
      setError('Plan ID or question ID is required to browse Problem Solving case studies.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (planId) params.set('plan_id', planId);
      if (questionIdParam) params.set('question_id', questionIdParam);
      const url = `/api/problem-solving/question${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Problem solving data request failed (${response.status})`);
      }
      const payload: ProblemSolvingResponse = await response.json();
      const studies = payload.case_studies ?? [];
      setCaseStudies(studies);
      setCurrentQuestion(payload.current_question ?? null);
      const resolvedQuestionId =
        payload.current_question?.id ?? studies?.[0]?.question_id ?? questionIdParam ?? '';
      if (!questionIdParam && resolvedQuestionId) {
        updateQuery(resolvedQuestionId);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load case studies.');
      setCaseStudies([]);
      setCurrentQuestion(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseStudies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, questionIdParam]);

  const activeCaseIndex = useMemo(() => {
    if (!caseStudies.length) return 0;
    const targetId = questionIdParam ?? currentQuestion?.id;
    const idx = caseStudies.findIndex((cs) => cs.question_id === targetId);
    return idx >= 0 ? idx : 0;
  }, [caseStudies, questionIdParam, currentQuestion]);

  const currentCase = caseStudies[activeCaseIndex];
  const hasNext = activeCaseIndex + 1 < caseStudies.length;
  const hasPrevious = activeCaseIndex > 0;

  useEffect(() => {
    setConversationHistory([]);
    setIdentifiedQuestions([]);
  }, [questionIdParam]);

  const goToQuestion = (questionId?: string) => {
    if (!questionId) return;
    updateQuery(questionId);
  };

  const mentorExerciseId =
    exerciseIdParam || (planId ? `plan-${planId}-problem-solving` : 'problem-solving-case-study');
  const mentorQuestionId = questionIdParam || currentQuestion?.id || 'problem-solving-case-study';

  useEffect(() => {
    const loadHistory = async () => {
      if (!mentorQuestionId) return;
      try {
        const res = await fetch(
          `/api/problem-solving/mentor-chat?question_id=${encodeURIComponent(mentorQuestionId)}`,
        );
        const text = await res.text();
        if (!res.ok) {
          throw new Error(text || 'Failed to load mentor chat history');
        }
        const data = text
          ? (JSON.parse(text) as { messages?: MentorChatHistoryMessage[] })
          : { messages: [] };
        const mapped: MentorChatMessage[] =
          data.messages?.map((m) => ({
            role: m.role === 'mentor' ? 'mentor' : 'student',
            content: typeof m.message === 'string' ? m.message : '',
            created_at: m.created_at,
          })) ?? [];
        const filteredMessages = mapped.filter((m) => m.content);
        setConversationHistory(filteredMessages);
      } catch (err) {
        console.error(
          err instanceof Error ? err.message : 'Failed to load mentor chat history',
        );
      }
    };
    loadHistory();
  }, [mentorQuestionId]);

  const handleMentorMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return '';

    const payload = {
      student_message: trimmed,
      context:
        currentCase?.business_problem ||
        currentCase?.case_study_context ||
        currentCase?.description ||
        '',
      hypothesis: currentCase?.problem_statement || currentCase?.title || '',
      target_questions: [],
      conversation_history: conversationHistory,
      identified_questions: identifiedQuestions,
      exercise_title: currentCase?.title || 'Problem Solving Case Study',
      exercise_description:
        currentCase?.description || currentCase?.case_study_context || currentCase?.business_problem || '',
      exercise_questions: [
        currentQuestion?.text ||
          currentCase?.problem_statement ||
          currentCase?.description ||
          currentCase?.title ||
          '',
      ].filter(Boolean),
      section_title: 'Problem Solving',
      section_overview: currentCase?.case_study_context || '',
      guiding_prompt: currentQuestion?.text || currentCase?.problem_statement || currentCase?.title || '',
      question_id: mentorQuestionId,
    };

    const response = await fetch('/api/problem-solving/mentor-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || 'Mentor chat request failed');
    }

    const data = text ? (JSON.parse(text) as { message?: string; identified_questions?: string[] }) : {};
    const mentorReply =
      data.message?.trim() ||
      'I’m thinking this through. Can you share more about how you would approach the problem?';

    setIdentifiedQuestions(data.identified_questions ?? identifiedQuestions);
    setConversationHistory((prev) => [
      ...prev,
      { role: 'student', content: trimmed, created_at: new Date().toISOString() },
      { role: 'mentor', content: mentorReply, created_at: new Date().toISOString() },
    ]);

    return mentorReply;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-gray-900">Problem Solving Case Studies</h1>
            {planId && (
              <span className="text-xs uppercase tracking-[0.4em] text-gray-500">
                Plan {planId}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            Review the narrative-focused problem statements and descriptions before jumping into the mentor chat.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href={`/exercises?subject=Problem+Solving${planId ? `&plan_id=${planId}` : ''}`}
              className="inline-flex items-center gap-1 rounded-full border border-blue-100 px-3 py-1 text-blue-600 hover:bg-blue-50 transition"
            >
              Return to Problem Solving exercises
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]">
          <section className="space-y-4">
            {loading && (
              <div className="rounded-2xl border border-blue-100 bg-white/80 p-6 flex items-center gap-3 text-sm text-blue-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading Problem Solving case studies...
              </div>
            )}

            {!loading && error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                {error}
              </div>
            )}

            {!loading && !error && !currentCase && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 p-6 text-sm text-gray-600">
                No Problem Solving case studies are available yet. Please run your plan generation again or wait for the AI to finish processing.
              </div>
            )}

            {currentCase && (
              <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-500">
                      Case Study {activeCaseIndex + 1} of {caseStudies.length}
                    </p>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {currentCase.title || 'Untitled Problem Solving Scenario'}
                    </h2>
                  </div>
                  {currentCase.estimated_time_minutes && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                      {currentCase.estimated_time_minutes} min
                    </span>
                  )}
                </div>

                <div className="space-y-4 text-sm text-gray-700">
                  {/* <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 mb-1">
                      Problem Statement
                    </p>
                    <p className="whitespace-pre-line">
                      {currentCase.problem_statement ||
                        currentCase.business_problem ||
                        'Problem statement not provided yet.'}
                    </p>
                  </div> */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 mb-1">
                      Description
                    </p>
                    <p className="whitespace-pre-line">
                      {currentCase.description ||
                        currentCase.case_study_context ||
                        currentCase.business_problem ||
                        'Description is pending.'}
                    </p>
                  </div>
                  {/* {currentQuestion?.text && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 mb-1">
                        Practice Prompt
                      </p>
                      <p className="whitespace-pre-line text-gray-800">
                        {currentQuestion.text}
                      </p>
                    </div>
                  )} */}
                </div>

                <div className="flex justify-between gap-2 pt-4">
                  <button
                    className="flex-1 rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 disabled:border-gray-200 disabled:text-gray-300"
                    onClick={() => goToQuestion(caseStudies[activeCaseIndex - 1]?.question_id)}
                    disabled={!hasPrevious}
                  >
                    Previous
                  </button>
                  <button
                    className="flex-1 rounded-2xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-200 disabled:text-gray-500"
                    onClick={() => goToQuestion(caseStudies[activeCaseIndex + 1]?.question_id)}
                    disabled={!hasNext}
                  >
                    Next
                  </button>
                </div>
              </article>
            )}
          </section>

          <section className="space-y-4">
            <div className="sticky top-6 h-fit rounded-3xl border border-gray-200 bg-white shadow-sm">
              <MentorChat
                key={`${mentorQuestionId}-${conversationHistory.length}`}
                exerciseId={mentorExerciseId}
                questionId={mentorQuestionId}
                isOpen
                initialMessages={conversationHistory}
                onSendMessage={handleMentorMessage}
              />
            </div>
          </section>
        </div>
      </div>
      </div>
  );
}
