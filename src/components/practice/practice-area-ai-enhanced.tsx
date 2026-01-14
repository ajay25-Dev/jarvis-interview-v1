"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

import {

  Code,

  Database,

  BarChart3,

  FileSpreadsheet,

  Check,

  Clock,

  RefreshCw,

  Lightbulb,

  ChevronLeft,

  ChevronRight,

  Loader2,

  AlertCircle,

  Brain,

  BookOpen

} from 'lucide-react';

import ReactMarkdown from 'react-markdown';

import { toast } from 'sonner';

import { CodeExecutor, type SqlTablePreview } from './code-executor';

import { MentorChat } from './mentor-chat';

import { PracticeErrorBoundary } from './practice-error-boundary';

import {

  ExecutionResult,

  PracticeQuestionType,

  PracticeAreaAIProps,

  AISubmissionResult,

  AIHintResult,

} from './types';

import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

import { formatDatasetValue } from '@/lib/utils';



type ParsedQuestionSections = {

  businessQuestion?: string;

  expectedOutput?: string;

  topics?: string[];

  difficulty?: string;

  raw?: string;

};



const stripHtmlTags = (value = '') => {

  return value

    .replace(/<pre[^>]*>/gi, '\n')

    .replace(/<\/pre>/gi, '\n')

    .replace(/<br\s*\/?>/gi, '\n')

    .replace(/<\/?strong[^>]*>/gi, '')

    .replace(/&nbsp;/gi, ' ')

    .replace(/<[^>]+>/g, '')

    .replace(/\r\n/g, '\n')

    .replace(/\n{2,}/g, '\n\n')

    .trim();

};



const parseQuestionSections = (value = ''): ParsedQuestionSections => {

  const normalized = stripHtmlTags(value);

  const businessMatch = normalized.match(/business question:\s*([\s\S]*?)(?=expected output|topic\(s\)|\[difficulty:|\n\d+\.|$)/i);

  const expectedMatch = normalized.match(/expected output(?:\s*\([^)]*\))?:\s*([\s\S]*?)(?=topic\(s\)|\[difficulty:|\n\d+\.|$)/i);

  const topicMatch = normalized.match(/topic\(s\):\s*([\s\S]*?)(?=\[difficulty:|$)/i);

  const difficultyMatch = normalized.match(/\[difficulty:\s*([^\]]+)\]/i);



  const topics =

    topicMatch?.[1]

      ?.split(/[,;|]/)

      .map((topic) => topic.trim())

      .filter(Boolean) ?? [];



  return {

    businessQuestion: businessMatch?.[1]?.trim(),

    expectedOutput: expectedMatch?.[1]?.trim(),

    topics,

    difficulty: difficultyMatch?.[1]?.trim(),

    raw: normalized,

  };

};



type ExecutionPayload = {
  aiEvaluation?: {
    verdict?: string;
    feedback?: string;
    raw_response?: unknown;
  };
  verdict?: string;
  feedback?: string;
  raw_response?: unknown;
  rawResponse?: unknown;
  [key: string]: unknown;
};

type SubmissionHistoryRecord = {
  id?: string;
  attempt_number?: number;
  attemptNumber?: number;
  execution_result?: unknown;
  is_correct?: boolean;
  feedback?: string;
  user_answer?: string;
  created_at?: string;
};


const getHistoryRecordId = (record: SubmissionHistoryRecord, index: number) => {
  if (record?.id) return String(record.id);
  if (record?.attempt_number !== undefined) return String(record.attempt_number);
  if (record?.attemptNumber !== undefined) return String(record.attemptNumber);
  return `attempt-${index}`;
};



const getDifficultyBadgeClass = (value?: string) => {

  if (!value) return 'bg-gray-100 text-gray-800';

  const lower = value.toLowerCase();

  if (lower.includes('beginner') || lower.includes('easy')) return 'bg-green-100 text-green-800';

  if (lower.includes('intermediate') || lower.includes('medium')) return 'bg-yellow-100 text-yellow-800';

    return 'bg-red-100 text-red-800';

};



const TEXT_ONLY_SUBJECTS = ['google_sheets', 'statistics', 'power_bi'] as const;
type TextOnlySubject = (typeof TEXT_ONLY_SUBJECTS)[number];



const normalizeExerciseType = (

  type: PracticeQuestionType,

  title?: string,

): PracticeQuestionType => {

  const normalizedType = type.toLowerCase().replace(/[\s-]+/g, '_');

  if (normalizedType === 'power_bi') {

    return 'power_bi';

  }



  const normalizedTitle = title?.toLowerCase() ?? '';

  if (normalizedTitle.includes('power bi')) {

    return 'power_bi';

  }



  return type;

};



export function PracticeAreaAIEnhanced({

  questions,

  datasets,

  exerciseType,

  exerciseTitle,

  exerciseDifficulty,

  exerciseId,

  activeQuestionIndex = 0,

  onCodeChange,

  onNext,

  onPrevious,

  aiEvaluation,

  aiHint,

  timeSpent,

  datasetDescription,

  dataCreationSql,

  businessContext,

}: PracticeAreaAIProps) {

  const [userCode, setUserCode] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submissionResult, setSubmissionResult] = useState<ExecutionResult | AISubmissionResult | null>(null);

  const [showHint, setShowHint] = useState(false);

  const [hintResult, setHintResult] = useState<AIHintResult | null>(null);

  const [showMentorChat, setShowMentorChat] = useState(false);

  const isResultsExpanded = true;

  const aiEvaluationEnabled = true;

  const aiHintsEnabled = true;

  const [sqlTablePreviews, setSqlTablePreviews] = useState<SqlTablePreview[]>([]);

  const [duckDbTableNames, setDuckDbTableNames] = useState<string[]>([]);

  const [submissionHistory, setSubmissionHistory] = useState<SubmissionHistoryRecord[]>([]);

  const [historyLoading, setHistoryLoading] = useState(false);

  const [historyError, setHistoryError] = useState('');

  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const historyPrefillRecordId = useRef<string | null>(null);



  const resolvedExerciseType = useMemo(

    () => normalizeExerciseType(exerciseType, exerciseTitle),

    [exerciseType, exerciseTitle],

  );



  const currentQuestion = questions[activeQuestionIndex];

  const currentQuestionId = useMemo(() => {

    if (!currentQuestion) return null;

    return currentQuestion.id;

  }, [currentQuestion]);



  const resolvedQuestionText = useMemo(() => {

    if (!currentQuestion) return '';

    return currentQuestion.text || '';

  }, [currentQuestion]);



  const questionSections = useMemo(

    () => parseQuestionSections(resolvedQuestionText),

    [resolvedQuestionText],

  );

  const finalTopics =

    questionSections.topics && questionSections.topics.length > 0

      ? questionSections.topics

      : currentQuestion?.topics || [];

  const difficultyLabel =

    questionSections.difficulty ||

    currentQuestion?.difficulty ||

    exerciseDifficulty ||

    'Medium';

  const answerText = stripHtmlTags(

    currentQuestion?.expected_answer ||

      currentQuestion?.explanation ||

      currentQuestion?.sample_output ||

      currentQuestion?.hint ||

      '',

  );

  // console.log("khkj",currentQuestion?.content?.business_context);



  const questionBusinessContext =
    typeof businessContext === 'string'
      ? businessContext
      : typeof currentQuestion?.content?.business_context === 'string'
      ? currentQuestion.content.business_context
      : typeof (currentQuestion as { business_context?: string } | null)?.business_context === 'string'
      ? (currentQuestion as { business_context?: string }).business_context
      : '';



  const textOnlyType = resolvedExerciseType as PracticeQuestionType & string;
  const isTextAnswerMode = TEXT_ONLY_SUBJECTS.includes(textOnlyType as TextOnlySubject);

  const textAnswerPlaceholder = getTextAnswerPlaceholder(resolvedExerciseType);



  useEffect(() => {

    console.log(

      questionBusinessContext ?? 'business_context is empty',

    );

  }, [questionBusinessContext]);



  useEffect(() => {

    if (currentQuestion) {

      console.log('current question content:', currentQuestion.content);

      console.log('question payload:', currentQuestion);

    }

  }, [currentQuestion]);



  const hasStructuredQuestion =

    Boolean(questionSections.businessQuestion) || Boolean(questionSections.expectedOutput);



  // Initialize code when question changes

  useEffect(() => {

    historyPrefillRecordId.current = null;

    if (!currentQuestion) {

      setUserCode('');

      setSubmissionResult(null);

      setHintResult(null);

      return;

    }



    // Get stored submission or use starter code

    const storedSubmission = currentQuestion.latestSubmission;

    const starterCode =

      storedSubmission &&

      typeof storedSubmission.userAnswer === 'string' &&

      storedSubmission.userAnswer.trim().length > 0

        ? storedSubmission.userAnswer

        : typeof currentQuestion.starter_code === 'string' &&

          currentQuestion.starter_code.trim().length > 0

        ? currentQuestion.starter_code

        : getDefaultCode(resolvedExerciseType);



    setUserCode(starterCode);

    setShowHint(false);

    setSubmissionResult(null);

  }, [

    currentQuestion,

    currentQuestionId,

    activeQuestionIndex,

    exerciseType,

    resolvedQuestionText,

    resolvedExerciseType,

  ]);



  const getLanguageIcon = (type: string) => {

    switch (type) {

    case 'sql': return <Database className="w-4 h-4" />;

    case 'python': return <Code className="w-4 h-4" />;

    case 'statistics': return <BarChart3 className="w-4 h-4" />;

    case 'google_sheets': return <FileSpreadsheet className="w-4 h-4" />;

    default: return <Code className="w-4 h-4" />;

    }

  };



const getLanguageDisplayName = (type: string) => {

  switch (type) {

    case 'sql': return 'SQL';

    case 'python': return 'Python';

    case 'statistics': return 'Statistics';

    case 'google_sheets': return 'Google Sheets';

    case 'reasoning': return 'Logic & Reasoning';

    case 'math': return 'Mathematics';

    case 'geometry': return 'Geometry';

    default: return type.charAt(0).toUpperCase() + type.slice(1);

  }

};



const getDefaultCode = (type: string) => {

  switch (type) {

    case 'sql':

      return '-- Write your SQL query here\nSELECT * FROM  ;';

    case 'python':

      return `# Write your Python solution here

def solution():

    # Your code here

    pass



# Test your solution

result = solution()

print(result)`;

    case 'statistics':

      return '';

    case 'google_sheets':

      return '';

    default:

      return '# Write your solution here';

  }

};



function getTextAnswerPlaceholder(type: string) {

  switch (type) {

    case 'google_sheets':

      return 'Describe how you would approach or solve this problem in Google Sheets.';

    case 'statistics':

      return 'Summarize your statistical reasoning, findings, or interpretation here.';

    default:

      return 'Enter your answer here.';

  }

}



const formatTime = (seconds: number) => {

  const mins = Math.floor(seconds / 60);

  const secs = seconds % 60;

  return `${mins}:${secs.toString().padStart(2, '0')}`;

};



// Enhanced submit handler with AI integration

const handleSubmit = async () => {

  if (!aiEvaluation || !currentQuestionId) {

    console.warn('AI evaluation not available');

    return;

  }

  

  setIsSubmitting(true);

  setSubmissionResult(null);



  try {

    const submissionTime = timeSpent || 0;

    

    // First try AI evaluation

    let result: AISubmissionResult | null = null;

    

    if (aiEvaluationEnabled) {

      const topicHierarchy =

        typeof currentQuestion?.content?.topic_hierarchy === 'string'

          ? currentQuestion.content.topic_hierarchy

          : '';

      const futureTopicsRaw =

        Array.isArray(currentQuestion?.content?.future_topics)

          ? currentQuestion?.content?.future_topics

          : [];

      const futureTopics: string[] = futureTopicsRaw

        .map((item) => (typeof item === 'string' ? item : null))

        .filter((item): item is string => Boolean(item));

      result = await aiEvaluation({

        questionId: currentQuestionId,

        question: resolvedQuestionText,

        expectedAnswer: currentQuestion?.expected_output_table?.[0] || '',

        studentAnswer: userCode,

        subject: exerciseType,

        topicHierarchy,

        futureTopics,

      });

    }



    // Handle AI submission

      if (result && result.success) {

      const enhancedResult: AISubmissionResult = {

        success: true,

        passed: result.passed,

        verdict: result.verdict,

        feedback: result.feedback,

        rawResponse: result.rawResponse,

        userAnswer: userCode,

        timeSpent: submissionTime,

        isAIEvaluated: true,

        aiEvaluation: result.aiEvaluation,

      };



      setSubmissionResult(enhancedResult);

      

      if (result.verdict === 'Correct') {

        toast.success('Perfect! ' + result.feedback);

      } else {

        toast.error(result.feedback);

      }

    } else if (result) {

      setSubmissionResult(result);

      } else {

        // Fallback to execution-only result

      const fallbackResult: AISubmissionResult = {

        success: true,

        passed: false,

        verdict: 'Pending execution',

        feedback: 'AI evaluation unavailable. Please try again.',

        userAnswer: userCode,

        timeSpent: submissionTime,

        isAIEvaluated: true,

        aiEvaluation: {

          verdict: 'Pending',

          feedback: 'AI evaluation unavailable. Please try again.',

        },

      };



      setSubmissionResult(fallbackResult);

      }



      await loadSubmissionHistory(true);

    } catch (error) {

    console.error('Submission failed:', error);

    toast.error('Failed to submit answer');

  } finally {

    setIsSubmitting(false);

  }

};



console.log(aiHint);



// Enhanced hint handler with AI integration

const handleRequestHint = async () => {

  if (!aiHint || !currentQuestionId) {

    console.log('AI hints not available');

    return;

  }



  try {

    type HintLevel = 'basic' | 'detailed' | 'partial';

    let hintLevel: HintLevel = 'basic';

    

    // Progress to better hints after multiple attempts

    const hintHistory = JSON.parse(localStorage.getItem(`hint-history-${exerciseId}-${currentQuestionId}`) || '{}');

    const previousAttempts = hintHistory?.attempts || 0;

    

    if (previousAttempts >= 6) {

      hintLevel = 'partial';

    } else if (previousAttempts >= 3) {

      hintLevel = 'detailed';

    }



    const result = await aiHint({

      questionId: currentQuestionId,

      question: resolvedQuestionText,

      expectedAnswer: currentQuestion?.expected_output_table?.[0] || '',

      studentAnswer: userCode,

      subject: exerciseType,

      topicHierarchy:

        typeof currentQuestion?.content?.topic_hierarchy === 'string'

          ? currentQuestion.content.topic_hierarchy

          : '',

      futureTopics:

        Array.isArray(currentQuestion?.content?.future_topics)

          ? currentQuestion.content.future_topics

              .map((item) => (typeof item === 'string' ? item : null))

              .filter((item): item is string => Boolean(item))

          : [],

      currentCode: userCode,

      datasetContext:

        typeof currentQuestion?.content?.dataset_context === 'string'

          ? currentQuestion.content.dataset_context

          : '',

      hintLevel,

    });



    // Save hint history

    const updatedHistory = {

      attempts: previousAttempts + 1,

      lastHint: result,

      timestamp: new Date().toISOString(),

    };

    

    localStorage.setItem(`hint-history-${exerciseId}-${currentQuestionId}`, JSON.stringify(updatedHistory));

    

    setHintResult(result);

    setShowHint(true);

    

    const messages = {

      basic: 'Here\'s a hint to get you started!',

      detailed: 'Let me provide more detailed guidance...',

      partial: 'Consider this app roach...',

    };

    

    if (result) {

      toast.info(messages[result.hintLevel || 'basic']);

    } else {

      console.warn('No hint received');

      toast.error('Failed to get hint');

    }

  } catch (error) {

    console.error('Hint request failed:', error);

    toast.error('Failed to get hint');

  }

};



const handleCodeChange = useCallback((newCode: string) => {

  setUserCode(newCode);

  if (onCodeChange) {

    onCodeChange(newCode);

  }

}, [onCodeChange]);



const resolvedDatasetDescription: string =

  typeof datasetDescription === 'string'

    ? datasetDescription

    : typeof currentQuestion?.dataset_description === 'string'

    ? currentQuestion.dataset_description

    : typeof currentQuestion?.content?.dataset_description === 'string'

    ? currentQuestion.content.dataset_description

    : questionSections.raw ||

      '';

const datasetDefinitionMatches = resolvedDatasetDescription

  ? Array.from(

      resolvedDatasetDescription.matchAll(/([A-Za-z0-9_]+)\(([^)]+)\)/g),

    ).map((match) => {
      const [, name, fieldsRaw] = match;
      const fieldsSource = fieldsRaw ?? '';
      return {
        name,
        fields: fieldsSource
          .split(',')
          .map((field) => field.trim())
          .filter(Boolean),
      };
    })

  : [];

const hasDatasetResources =

  Boolean(resolvedDatasetDescription) ||

  (datasets && datasets.length > 0) ||

  datasetDefinitionMatches.length > 0;

  const shouldShowDatasetResources = hasDatasetResources || duckDbTableNames.length > 0;



  useEffect(() => {

    setSqlTablePreviews([]);

    setDuckDbTableNames([]);

  }, [datasets, dataCreationSql]);



  const parseExecutionResult = (value: unknown): ExecutionPayload => {

    if (!value) return {};

    if (typeof value === 'string') {

      try {

        return JSON.parse(value) as ExecutionPayload;

      } catch {

        return {};

      }

    }

    if (typeof value === 'object' && !Array.isArray(value)) {

      return value as ExecutionPayload;

    }

    return {};

  };



  const historyDisplayResult = useMemo(() => {

    if (submissionHistory.length === 0) {

      return null;

    }



    const record = submissionHistory[0];

    if (!record) {
      return null;
    }

    const execResult = parseExecutionResult(record.execution_result);

    const verdict =

      execResult?.aiEvaluation?.verdict ||

      execResult?.verdict ||

      (record.is_correct ? 'Correct' : 'Incorrect');

    const feedback =

      record.feedback ||

      execResult?.aiEvaluation?.feedback ||

      execResult?.feedback ||

      'No feedback provided';



    return {

      success: verdict === 'Correct',

      verdict,

      feedback,

      rawResponse: execResult?.aiEvaluation?.raw_response || null,

      aiEvaluation: execResult?.aiEvaluation

        ? {

            verdict: execResult.aiEvaluation.verdict,

            feedback: execResult.aiEvaluation.feedback,

            raw_response: execResult.aiEvaluation.raw_response,

          }

        : null,

    } as AISubmissionResult;

  }, [submissionHistory]);




  

  const loadSubmissionHistory = useCallback(
    async (prefillCodeFromHistory = false) => {

    if (!exerciseId || !currentQuestionId) {

      return;

    }



    setHistoryLoading(true);

    setHistoryError('');



    try {

      const response = await fetch(

        `/api/interview-prep/exercises/${exerciseId}/questions/${currentQuestionId}/submissions`,

      );



      if (!response.ok) {

        throw new Error(await response.text());

      }



      const data = await response.json();

      const resolveSubmissions = (payload: unknown): SubmissionHistoryRecord[] => {

        if (Array.isArray(payload)) {

          return payload as SubmissionHistoryRecord[];

        }



        if (

          payload &&

          typeof payload === 'object' &&

          'submissions' in payload

        ) {

          return resolveSubmissions(

            (payload as { submissions?: unknown }).submissions,

          );

        }



        return [];

      };

      const submissions = resolveSubmissions(data?.submissions ?? data);

      setSubmissionHistory(submissions);

      if (prefillCodeFromHistory && submissions.length > 0) {
        const firstRecord = submissions[0];
        if (!firstRecord) {
          return;
        }
        const firstRecordId = getHistoryRecordId(firstRecord, 0);
        const selectedAnswer =
          typeof firstRecord?.user_answer === 'string'
            ? firstRecord.user_answer
            : '';
        if (
          firstRecordId &&
          firstRecordId !== historyPrefillRecordId.current &&
          selectedAnswer.trim().length > 0
        ) {
          historyPrefillRecordId.current = firstRecordId;
          setUserCode(selectedAnswer);
        }
      }

    } catch (error) {

      console.error('Failed to load submission history:', error);

      setHistoryError('Unable to load submission history');

      setSubmissionHistory([]);

    } finally {

      setHistoryLoading(false);

    }

  }, [currentQuestionId, exerciseId]);



  useEffect(() => {

    loadSubmissionHistory(true);

  }, [loadSubmissionHistory]);



  const displayedResult = submissionResult || historyDisplayResult;

  const hasAiEval =

    !!displayedResult &&

    'aiEvaluation' in displayedResult &&

    displayedResult.aiEvaluation;


  const aiEvaluationData = hasAiEval
    ? (displayedResult as AISubmissionResult)
    : null;

  const displayVerdict =
    aiEvaluationData?.aiEvaluation?.verdict ??
    aiEvaluationData?.verdict ??
    'Awaiting evaluation';

  const displayFeedback =
    aiEvaluationData?.aiEvaluation?.feedback ??
    aiEvaluationData?.feedback ??
    'No feedback provided.';

  const verdictColor =
    displayVerdict === 'Correct' ? 'text-emerald-600' : 'text-rose-600';



if (!currentQuestion) {

  return (

    <div className="p-8 text-center">

      <Card className="max-w-2xl mx-auto">

        <CardHeader>

          <CardTitle>No Questions Available</CardTitle>

        </CardHeader>

        <CardContent>

          <CardDescription>

            Please load a practice exercise to begin.

          </CardDescription>

        </CardContent>

      </Card>

    </div>

  );

}



return (

  <div className="flex h-full bg-gray-50">

    {/* AI Status Bar */}

    {/* <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-100 rounded-lg border border-blue-200">

      <div className="flex items-center justify-between">

        <h3 className="text-sm font-semibold text-blue-900">AI Assistant Status</h3>

        <div className="flex items-center gap-2">

            <div className={`w-2 h-2 rounded-full ${aiEvaluationEnabled ? 'bg-green-500' : 'bg-red-500'}`} />

            <span className="ml-2">

              {aiEvaluationEnabled ? 'AI Evaluation Active' : 'AI Evaluation Disabled'}

            </span>

        </div>

        <div className="flex items-center gap-2">

            <div className={`w-2 h-2 rounded-full ${aiHintsEnabled ? 'bg-green-500' : 'bg-red-500'}`} />

            <span className="ml-2">

              {aiHintsEnabled ? 'AI Hints Active' : 'AI Hints Disabled'}

            </span>

        </div>

      </div>

      

      {(aiEvaluationEnabled || aiHintsEnabled) && (

        <div className="mt-2">

          <div className="bg-white p-2 rounded border border-green-200">

            <h4 className="text-sm font-semibold text-green-800">AI Features Active</h4>

            <div className="text-xs text-green-700">

              Ã¢â‚¬Â¢ Intelligent submission evaluation with detailed feedback

              Ã¢â‚¬Â¢ Progressive hint system that adapts to your progress

              Ã¢â‚¬Â¢ Real-time AI assistance without delays

            </div>

          </div>

        </div>

      )}

    </div> */}



    {/* Main Content */}

    <div className="flex h-full bg-gray-50 gap-4 p-4">

      {/* Left Panel - Problem & Context */}

      <div className="flex-1 basis-1/2 flex flex-col overflow-hidden min-w-0">

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">

          {/* Header */}

          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">

            <div className="flex items-center gap-3">

              <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">

                {getLanguageIcon(resolvedExerciseType)}

              </div>

              <div>

                <h2 className="text-sm font-semibold text-gray-900">

                  {exerciseTitle || 'Practice Exercise (AI-Powered)'}

                </h2>

                <div className="flex items-center gap-2 text-xs text-gray-500">

                  <span>{getLanguageDisplayName(resolvedExerciseType)}</span>

                  <span>•</span>

                  <span>{exerciseDifficulty || 'Medium'}</span>

                  <Brain className="w-4 h-4 text-blue-600 ml-2" />

                  <span>AI Enhanced</span>

                </div>

              </div>

            </div>

            

            <div className="flex items-center gap-3">

              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 shadow-sm text-xs font-medium text-gray-600">

                <Clock className="w-3.5 h-3.5" />

                {formatTime(timeSpent || 0)}

              </div>

              

              <div className="text-xs text-gray-500">

                {/* <span>Time: {formatTime(timeSpent || 0)}</span> */}

                <span>AI Status: {!aiEvaluationEnabled ? 'Disabled' : 'Ready'}</span>

              </div>

            </div>

          </div>



          {/* Content */}

          <div className="flex-1 overflow-y-auto p-6">

            <div className="prose prose-sm max-w-none">

              <h3 className="text-lg font-semibold text-gray-900 mb-4">

                Question {activeQuestionIndex + 1} of {questions.length}

              </h3>



              {questionBusinessContext && (

                <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900">

                  <p className="text-[10px] uppercase tracking-[0.3em] text-blue-500 mb-1">Business Context</p>

                  <p className="text-sm leading-relaxed text-blue-900 font-medium">

                    {questionBusinessContext}

                  </p>

                </div>

              )}

              {currentQuestion.case_study_context && (

                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">

                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Case Study</h4>

                  <div className="text-sm text-blue-800 prose-sm max-w-none">

                    <ReactMarkdown>

                      {currentQuestion.case_study_context}

                    </ReactMarkdown>

                  </div>

                </div>

              )}



              <div className="mb-6 space-y-4">

                <div id="questiondata" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">

                  <div className="flex items-start justify-between gap-3">

                    <div>

                      <p className="text-xs uppercase tracking-wider text-gray-500">Question</p>

                      <h3 className="text-lg font-semibold text-gray-900">

                        Business Question

                      </h3>

                    </div>

                    <Badge className={getDifficultyBadgeClass(difficultyLabel)}>

                      {difficultyLabel}

                    </Badge>

                  </div>

                  {questionSections.businessQuestion && (

                    <div className="space-y-1 text-sm text-gray-700">

                      <p className="font-semibold text-gray-900">Business Question</p>

                      <ReactMarkdown>{questionSections.businessQuestion}</ReactMarkdown>

                    </div>

                  )}

                  {questionSections.expectedOutput && (

                    <div className="space-y-1 text-sm text-gray-700">

                      <p className="font-semibold text-gray-900">Expected Output</p>

                      <ReactMarkdown>{questionSections.expectedOutput}</ReactMarkdown>

                    </div>

                  )}

                  {finalTopics.length > 0 && (

                    <div className="space-y-1">

                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Topics</p>

                      <div className="flex flex-wrap gap-2">

                        {finalTopics.map((topic) => (

                          <Badge key={topic} variant="secondary" className="text-xs">

                            {topic}

                          </Badge>

                        ))}

                      </div>

                    </div>

                  )}

                  {answerText && (

                    <div className="space-y-1">

                      <p className="font-semibold text-gray-900">Answer</p>

                      <pre className="text-[11px] whitespace-pre-wrap rounded-lg bg-gray-900/90 text-white p-3">

                        {answerText}

                      </pre>

                    </div>

                  )}

                </div>

                {!hasStructuredQuestion && (

                  <div className="text-gray-700">

                    <ReactMarkdown>{resolvedQuestionText}</ReactMarkdown>

                  </div>

                )}

              </div>



              {/* Dataset Information */}

              {shouldShowDatasetResources && (

                <div className="mb-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">

                  { <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2">

                      <BookOpen className="w-4 h-4 text-blue-600" />

                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-[0.3em]">

                        Dataset & Resources

                      </h4>

                    </div>

                    <span className="text-[11px] text-gray-500">

                      {datasetDefinitionMatches.length > 0

                        ? `${datasetDefinitionMatches.length} table${datasetDefinitionMatches.length === 1 ? '' : 's'}`

                        : `${datasets.length} resource${datasets.length === 1 ? '' : 's'}`}

                    </span>

                  </div> }

                  {/* {resolvedDatasetDescription && (

                    <p className="text-sm text-gray-600 whitespace-pre-line">

                      {resolvedDatasetDescription}

                    </p>

                  )}

                  {datasetDefinitionMatches.length > 0 && (

                    <div className="space-y-3">

                      {datasetDefinitionMatches.map((def) => (

                        <div

                          key={`dataset-schema-${def.name}`}

                          className="rounded-lg border border-gray-100 bg-gray-50 p-3"

                        >

                          <div className="flex items-center justify-between mb-2">

                            <p className="text-sm font-semibold text-gray-900">{def.name}</p>

                            <span className="text-[11px] text-gray-500">

                              {def.fields.length} columns

                            </span>

                          </div>

                          <div className="overflow-x-auto">

                            <table className="min-w-full text-[11px] text-left text-gray-700">

                              <thead className="text-[10px] uppercase text-gray-500 bg-white">

                                <tr>

                                  <th className="px-2 py-1">Column</th>

                                </tr>

                              </thead>

                              <tbody>

                                {def.fields.map((column) => (

                                  <tr

                                    key={`${def.name}-${column}`}

                                    className="border-t border-white last:border-b"

                                  >

                                    <td className="px-2 py-1">{column}</td>

                                  </tr>

                                ))}

                              </tbody>

                            </table>

                          </div>

                        </div>

                      ))}

                    </div>

                  )} */}

                  {/* {creationSchemas.length > 0 && (

                    <div className="space-y-4">

                      <div className="flex items-center justify-between">

                        <span className="text-xs uppercase tracking-[0.4em] text-gray-500">

                          Creation SQL

                        </span>

                        <span className="text-[11px] text-gray-400">Structured Table</span>

                      </div>

                      <div className="space-y-3">

                        {creationSchemas.map((schema) => (

                          <div

                            key={`schema-${schema.table}`}

                            className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm text-[11px]"

                          >

                            <div className="flex items-center justify-between mb-2">

                              <span className="font-semibold text-gray-900">

                                Table: {schema.table}

                              </span>

                              <span className="text-[9px] uppercase text-gray-400">

                                {schema.columns.length} columns

                              </span>

                            </div>

                            <div className="grid grid-cols-2 gap-2 text-gray-600">

                              {schema.columns.map((column) => (

                                <div key={`${schema.table}-${column.name}`} className="text-[11px]">

                                  <p className="font-medium text-gray-800">{column.name}</p>

                                  <p className="text-[10px] text-gray-500">

                                    {column.definition || <span className="text-gray-400">type</span>}

                                  </p>

                                </div>

                              ))}

                            </div>

                          </div>

                        ))}

                      </div>

                    </div>

                  )} */}

                    {duckDbTableNames.length > 0 && (

                      <div className="mt-3 flex flex-wrap items-center gap-2">

                        <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">

                          Tables:

                        </span>

                        <div className="flex flex-wrap gap-1">

                          {duckDbTableNames.map((tableName) => (

                            <Badge

                              key={`table-name-${tableName}`}

                              variant="outline"

                              className="text-[10px] px-2 py-0.5 rounded-full"

                            >

                              {tableName}

                            </Badge>

                          ))}

                        </div>

                      </div>

                    )}

                    <div className="space-y-6">

                    {datasets.map((ds, idx) => {

                      // Dataset display logic (from original component)

                      let rawData: unknown = ds.data;

                      if (typeof rawData === 'string') {

                        try {

                          rawData = JSON.parse(rawData);

                        } catch {

                          rawData = [];

                        }

                      }

                      let displayColumns = ds.columns || [];

                      if (!Array.isArray(rawData) && typeof rawData === 'object' && rawData !== null) {

                        const keys = Object.keys(rawData as Record<string, unknown>);

                        const values = Object.values(rawData as Record<string, unknown>);

                        const isColumnar = values.length > 0 && values.every((v) => Array.isArray(v));

                        if (isColumnar) {

                           const firstColumn = values[0];

                           const numRows = Array.isArray(firstColumn) ? firstColumn.length : 0;

                           const newRows: Record<string, unknown>[] = [];

                           for(let i=0; i<numRows; i++) {

                             const row: Record<string, unknown> = {};

                             keys.forEach((key, colIdx) => {

                               const columnValues = values[colIdx];

                               if (Array.isArray(columnValues)) {

                                 row[key] = columnValues[i];

                               }

                             });

                             newRows.push(row);

                           }

                           rawData = newRows;

                           if (displayColumns.length === 0) {

                             displayColumns = keys;

                           }

                        } else {

                           rawData = Object.values(rawData);

                        }

                      }

                      const hasData = Array.isArray(rawData) && rawData.length > 0;

                      if (displayColumns.length === 0 && hasData) {

                         const firstRow = (rawData as unknown[])[0];

                         if (Array.isArray(firstRow)) {

                           displayColumns = firstRow.map((_, i: number) => String(i));

                         } else if (typeof firstRow === 'object' && firstRow !== null) {

                           displayColumns = Object.keys(firstRow);

                         }

                      }



                      return (

                        <div key={idx} className="space-y-3">

                          {/* <div className="flex items-center justify-between">

                            <div>

                              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">

                                Dataset Preview

                              </p>

                              <p className="text-sm font-semibold text-gray-900">

                                Table: {ds.table_name || ds.name || `Dataset ${idx + 1}`}

                              </p>

                            </div>

                            <div className="flex items-center gap-2">

                              {ds.subject_type && (

                                <Badge variant="outline" className="text-[10px]">

                                  {ds.subject_type}

                                </Badge>

                              )}

                              <span className="text-[11px] text-gray-500 font-mono">

                                {hasData ? `${rawData?.length || 0} rows` : `${displayColumns.length} columns`}

                              </span>

                            </div>

                          </div>



                          {ds.description && (

                            <p className="text-sm text-gray-600">{ds.description}</p>

                          )}



                          {displayColumns.length > 0 && (

                            <div className="flex flex-wrap gap-1">

                              {displayColumns.map((col) => (

                                <Badge key={`column-${col}`} variant="outline" className="text-[10px]">

                                  {col}

                                </Badge>

                              ))}

                            </div>

                          )} */}



                          {/* {hasData ? (

                            <div className="overflow-hidden border border-gray-200 rounded-xl bg-white shadow-sm">

                              <div className="overflow-x-auto">

                                <table className="w-full text-xs text-left border-collapse">

                                  <thead className="bg-gray-50 border-b border-gray-200">

                                    <tr>

                                      {displayColumns.map((col) => (

                                        <th

                                          key={`${col}-head`}

                                          className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap border-r border-gray-200 last:border-0"

                                        >

                                          {displayColumns.length > 0 &&

                                          displayColumns.every((c, i) => c === String(i))

                                            ? `col_${parseInt(col) + 1}`

                                            : col}

                                        </th>

                                      ))}

                                    </tr>

                                  </thead>

                                  <tbody className="divide-y divide-gray-100">

                                    {previewRows.map((row, rowIdx) => {
                                      const resolveCellValue = (col: string) => {
                                        if (Array.isArray(row)) {
                                          const index = Number(col);
                                          return Number.isNaN(index) ? '' : row[index];
                                        }
                                        if (row && typeof row === 'object') {
                                          return (row as Record<string, unknown>)[col];
                                        }
                                        return '';
                                      };

                                      return (
                                        <tr key={`row-${rowIdx}`} className="hover:bg-gray-50">

                                          {displayColumns.map((col) => (

                                            <td

                                              key={`${col}-${rowIdx}`}

                                              className="px-3 py-2 text-gray-600 whitespace-nowrap border-r border-gray-100 last:border-0"

                                            >

                                              {formatDatasetValue(resolveCellValue(col), col)}

                                            </td>

                                          ))}

                                        </tr>
                                      );
                                    })}

                                  </tbody>

                                </table>

                              </div>

                              {rawData && rawData.length > 5 && (

                                <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 text-center text-[11px] text-gray-500">

                                  Showing 5 of {rawData.length} rows

                                </div>

                              )}

                            </div>

                          ) : (

                            <p className="text-xs text-gray-500 italic">

                              Dataset preview unavailable. Column listing above.

                            </p>

                          )} */}



                          {/* {ds.creation_sql && (

                            <div className="rounded-lg border border-gray-200 bg-gray-100 p-3 text-[11px] text-gray-800 font-mono">

                              <p className="font-semibold text-gray-900 text-[12px] mb-1">Creation SQL</p>

                              <pre className="whitespace-pre-wrap">{ds.creation_sql}</pre>

                            </div>

                          )} */}

                        </div>

                      );

                    })}

                    

                    {sqlTablePreviews.length > 0 && (

                      <div className="space-y-4 pb-2">

                        <div className="flex items-center justify-between">

                          <span className="text-xs uppercase tracking-[0.3em] text-gray-500">

                            SQL Tables Loaded

                          </span>

                          <span className="text-[11px] text-gray-400">Preview</span>

                        </div>

                        {sqlTablePreviews.map((table) => (

                          <div

                            key={`sql-table-${table.tableName}`}

                            className="space-y-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"

                          >

                            <div className="flex items-center justify-between">

                              <div className="text-sm font-semibold text-gray-900">

                                Table: {table.tableName}

                              </div>

                              <span className="text-[11px] text-gray-500">

                                {table.rowCount} row{table.rowCount === 1 ? '' : 's'}

                              </span>

                            </div>

                            {table.columns.length > 0 && (

                              <div className="flex flex-wrap gap-1">

                                {table.columns.map((col) => (

                                  <Badge

                                    key={`sql-col-${table.tableName}-${col}`}

                                    variant="outline"

                                    className="text-[10px]"

                                  >

                                    {col}

                                  </Badge>

                                ))}

                              </div>

                            )}

                            {table.rows.length > 0 ? (

                              <div className="w-full max-w-full overflow-x-scroll overflow-y-scroll max-h-[320px] rounded border border-gray-200 bg-gray-50">

                                <table
                                  className="w-full table-fixed min-w-full text-[11px] text-left text-gray-700 break-words overflow-x-auto"
                                >

                                  <thead className="bg-white text-gray-500 uppercase tracking-wide text-[10px]">

                                    <tr>

                                      {table.columns.map((col) => (

                                        <th

                                          key={`sql-head-${table.tableName}-${col}`}

                                          className="px-2 py-1"

                                        >

                                          {col}

                                        </th>

                                      ))}

                                    </tr>

                                  </thead>

                                  <tbody>

                                    {table.rows.map((row, rowIdx) => (

                                      <tr

                                        key={`sql-row-${table.tableName}-${rowIdx}`}

                                        className="border-t border-gray-100"

                                      >

                                        {table.columns.map((_, colIdx) => (

                                          <td

                                            key={`sql-cell-${table.tableName}-${rowIdx}-${colIdx}`}

                                            className="px-2 py-1 break-words"

                                          >

                                            {formatDatasetValue(row[colIdx], table.columns[colIdx])}

                                          </td>

                                        ))}

                                      </tr>

                                    ))}

                                  </tbody>

                                </table>

                              </div>

                            ) : (

                              <p className="text-[11px] text-gray-500 italic">Table is empty.</p>

                            )}

                            {table.rowCount > table.rows.length && (

                              <p className="text-[11px] text-gray-500">

                                Showing {table.rows.length} of {table.rowCount} rows.

                              </p>

                            )}

                          </div>

                        ))}

                      </div>

                    )}

                    {/* {datasets.length === 0 && (

                      <p className="text-xs text-gray-500 italic">

                        Datasets will appear here once available.

                      </p>

                    )} */}

                  </div>

                </div>

              )}



              {/* Hint Display */}

              {showHint && hintResult && (

                <div className={`mt-6 p-4 rounded-lg border ${

                  hintResult.verdict === 'Correct' 

                    ? 'bg-green-50 border-green-200' 

                    : hintResult.verdict === 'Incorrect'

                    ? 'bg-yellow-50 border-yellow-200'

                    : 'bg-blue-50 border-blue-200'

                }`}>

                  <div className="flex items-start gap-3">

                    <div className={`p-2 rounded-full ${

                      hintResult.verdict === 'Correct' 

                        ? 'bg-green-500' 

                        : hintResult.verdict === 'Incorrect'

                        ? 'bg-yellow-500'

                        : 'bg-blue-500'

                    }`}>

                      {hintResult.verdict === 'Correct' ? (

                        <Check className="w-4 h-4 text-white" />

                      ) : hintResult.verdict === 'Incorrect' ? (

                        <AlertCircle className="w-4 h-4 text-white" />

                      ) : (

                        <Lightbulb className="w-4 h-4 text-white" />

                      )} 

                    </div>

                    <div>

                      <h4 className={`text-sm font-semibold mb-1 ${

                        hintResult.verdict === 'Correct' 

                          ? 'text-green-800' 

                          : hintResult.verdict === 'Incorrect'

                          ? 'text-yellow-800'

                          : 'text-blue-800'

                      }`}>

                        {hintResult.verdict === 'Correct' ? 'Correct!' : hintResult.verdict}

                      </h4>

                      <p className={`text-sm mb-2 ${

                        hintResult.verdict === 'Correct' 

                          ? 'text-green-700' 

                          : hintResult.verdict === 'Incorrect'

                          ? 'text-yellow-700'

                          : 'text-blue-700'

                      }`}>

                        {hintResult.message}

                      </p>

                    </div>

                  </div>

                </div>

              )}



            </div>

          </div>



          {/* Footer Navigation */}

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">

            <div className="flex gap-2">

              <Button

                variant="outline"

                size="sm"

                onClick={onPrevious}

                disabled={!onPrevious || activeQuestionIndex === 0}

                className="gap-2"

              >

                <ChevronLeft className="w-4 h-4" />

                Previous

              </Button>

            </div>

            

            <div className="flex gap-2">

              <Button

                variant={isSubmitting ? 'outline' : 'ghost'}

                size="sm"

                onClick={handleRequestHint}

                disabled={isSubmitting || !aiHintsEnabled}

                className={`gap-2 ${isSubmitting ? 'text-gray-400' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}`}

              >

                <Lightbulb className="w-4 h-4" />

                {isSubmitting ? 'Submitting...' : 'Get AI Hint'}

              </Button>

              {/* <Button

                variant="ghost"

                size="sm"

                onClick={() => setShowMentorChat(!showMentorChat)}

                className={`gap-2 ${showMentorChat ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}

              >

                <MessageCircle className="w-4 h-4" />

                Mentor

              </Button> */}

            </div>



            <div className="flex gap-2">

              <Button

                variant="outline"

                size="sm"

                onClick={onNext}

                disabled={!onNext || activeQuestionIndex === questions.length - 1}

                className="gap-2"

              >

                Next

                <ChevronRight className="w-4 h-4" />

              </Button>

            </div>

          </div>

        </div>

      </div>



      {/* Right Panel - Editor & Results */}

      <PracticeErrorBoundary>

        <div className="flex-1 basis-1/2 flex flex-col overflow-hidden min-w-0 gap-4">

          {duckDbTableNames.length > 0 && (

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-slate-900/70 px-4 py-2 text-[11px] text-gray-100 shadow">

              <span className="font-semibold uppercase tracking-[0.3em] text-gray-400">Tables</span>

              <div className="flex flex-wrap gap-1">

                {duckDbTableNames.map((tableName) => (

                  <span

                    key={`editor-table-${tableName}`}

                    className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-0.5 text-[10px] text-slate-100"

                  >

                    {tableName}

                  </span>

                ))}

              </div>

            </div>

          )}

          {isTextAnswerMode ? (

            <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">

              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">

                <div className="text-sm font-semibold text-gray-900">Your Submission <br/>

                <small>Summarize your findings before submitting for review.</small></div>

                <span className="text-[11px] text-gray-500 uppercase tracking-[0.3em]">

                  {getLanguageDisplayName(exerciseType)}

                </span>

              </div>

              <div className="flex-1 px-6 pb-6 pt-4">

                <div className="flex flex-col gap-3 h-full">

                  <textarea

                    value={userCode}

                    onChange={(e) => handleCodeChange(e.target.value)}

                    placeholder={textAnswerPlaceholder}

                    spellCheck={false}

                    className="flex-1 w-full min-h-[240px] resize-none rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"

                  />

                  <p className="text-xs text-gray-500">

                    This response will be used for AI evaluation and mentor hints.

                  </p>

                </div>

              </div>

            </div>

          ) : (

            <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">

              <CodeExecutor

                exerciseType={exerciseType}

                datasets={datasets}

                initialCode={userCode}

                onCodeChange={handleCodeChange}

                dataCreationSql={dataCreationSql}

                onSqlTablePreviews={setSqlTablePreviews}

                onTableList={setDuckDbTableNames}

              />

            </div>

          )}

          {isTextAnswerMode && (
            <div className="hidden" aria-hidden="true">
              <CodeExecutor
                exerciseType={exerciseType}
                datasets={datasets}
                initialCode={userCode}
                dataCreationSql={dataCreationSql}
                onSqlTablePreviews={setSqlTablePreviews}
                onTableList={setDuckDbTableNames}
              />
            </div>
          )}


          {/* Results Panel */}

          {displayedResult && (

            <div
              className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden overflow-y-auto transition-all duration-300 ${
                isResultsExpanded ? 'h-1/3' : 'h-12'
              }`}
            >
              {/* AI Evaluation Results */}

              {hasAiEval ? (
                <div className="mb-4 border border-purple-200 bg-gradient-to-br from-purple-50 to-sky-50 p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-semibold uppercase tracking-[0.4em] text-purple-900">
                        AI Evaluation
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      <p className={`text-xs font-bold ${verdictColor}`}>
                          Verdict: {displayVerdict}
                        </p>
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-purple-100 bg-white/90 p-4">
                      <p className="text-[11px] uppercase tracking-[0.45em] text-purple-500">Feedback</p>
                      <p className="mt-3 text-sm text-purple-900 whitespace-pre-line">
                        {displayFeedback}
                      </p>
                      <p className="text-xs text-gray-500 mt-3">
                        Score derived from execution output & AI reasoning.
                      </p>
                    </div>
                    
                  </div>
                </div>
              ) : (
                <div className="mb-4 rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    {displayedResult.success ? 'Correct!' : 'Try Again'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {displayedResult.success
                      ? 'Great job! Your answer is correct.'
                      : hasAiEval
                      ? (displayedResult as AISubmissionResult).aiEvaluation?.feedback ||
                        'Review your code and try again.'
                      : 'Review your code and try again.'}
                  </p>
                </div>
              )}

            </div>

          )}


          
          {/* Submit Button Area */}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <Button

              variant="outline"

              size="sm"

              onClick={() => setHistoryPanelOpen((prev) => !prev)}

              disabled={submissionHistory.length === 0}

              className="gap-2"

            >

              <BookOpen className="w-4 h-4" />

              {historyPanelOpen ? 'Hide Submission History' : 'Submission History'}

            </Button>

            <div className="flex justify-end">

              <Button

                onClick={handleSubmit}

                disabled={isSubmitting || !aiEvaluationEnabled}

                className={`gap-2 ${

                  isSubmitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 text-white'

                }`}

              >

                {isSubmitting ? (

                  <RefreshCw className="w-4 h-4 animate-spin" />

                ) : (

                  <Check className="w-4 h-4" />

                )}

                {isSubmitting ? 'Submitting...' : 'Submit for AI Evaluation'}

              </Button>

            </div>

          </div>

        </div>

      </PracticeErrorBoundary>



      {historyPanelOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm"
            onClick={() => setHistoryPanelOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-hidden rounded-l-3xl border border-gray-200 bg-white shadow-2xl md:w-[420px]">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.4em] text-gray-500">Submission history</p>
                <p className="text-sm text-gray-900">{submissionHistory.length} attempts</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setHistoryPanelOpen(false)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            <div className="px-5 py-3 space-y-3">
              {historyLoading && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading history...
                </div>
              )}
              {historyError && (
                <p className="text-xs text-red-500">{historyError}</p>
              )}
            </div>
            <div className="max-h-[calc(100vh-6rem)] overflow-y-auto px-5 py-3 space-y-3">
              {submissionHistory.map((record, index) => {
                const execResult = parseExecutionResult(record.execution_result);
                const aiEvaluation = execResult?.aiEvaluation;
                const verdict =
                  aiEvaluation?.verdict ||
                  execResult?.verdict ||
                  (record.is_correct ? 'Correct' : 'Incorrect');
                const timestamp = record.created_at
                  ? new Date(record.created_at).toLocaleString()
                  : 'Timestamp unavailable';
                const evaluationLabel = aiEvaluation ? 'AI evaluation' : 'Execution result';
                const submissionPreviewSource =
                  typeof record?.user_answer === 'string' ? record.user_answer : '';
                const submissionPreview =
                  (submissionPreviewSource.split('\n')[0] ?? '').slice(0, 120);
                const badgeClasses =
                  verdict === 'Correct'
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                    : 'border-rose-100 bg-rose-50 text-rose-600';
                const recordId = getHistoryRecordId(record, index);

                return (
                  <div key={recordId} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3 pb-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400">Attempt</p>
                        <p className="text-sm font-semibold text-gray-800">
                          #{record.attempt_number ?? record.attemptNumber ?? index + 1}
                        </p>
                        <p className="text-[11px] text-gray-500">{timestamp}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold ${badgeClasses}`}
                        >
                          {verdict}
                        </span>
                        <p className="text-[11px] text-gray-400">{evaluationLabel}</p>
                      </div>
                    </div>
                    {submissionPreview && (
                      <div className="mt-2 rounded-xl border border-dashed border-gray-200 bg-slate-50 p-3">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 mb-1">
                          Submission preview
                        </p>
                        <p className="text-sm text-slate-900">
                          {submissionPreview}
                          {submissionPreviewSource.length > 120 ? '...' : ''}
                        </p>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
      {/* Mentor Chat Sidebar */}

      {showMentorChat && (

        <div className="w-80 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">

          <MentorChat

            exerciseId={exerciseId}

            questionId={currentQuestionId || ''}

            isOpen={showMentorChat}

            onMinimize={() => setShowMentorChat(false)}

          />

        </div>

              )}



            </div>

          </div>

  );

}

