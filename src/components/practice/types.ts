export type PracticeQuestionType = 
  | 'sql' 
  | 'python' 
  | 'google_sheets' 
  | 'statistics' 
  | 'power_bi'
  | 'reasoning' 
  | 'math' 
  | 'problem_solving' 
  | 'geometry'
  | 'coding'
  | 'programming'
  | 'javascript';

export type ExerciseType = PracticeQuestionType;

export type JsonPrimitive = string | number | boolean | null;

export interface JsonPlainObject {
  [key: string]: JsonPrimitive | JsonPlainArray | JsonPlainObject | undefined;
}

export interface JsonPlainArray extends Array<JsonPrimitive | JsonPlainObject | JsonPlainArray | undefined> {
  [index: number]: JsonPrimitive | JsonPlainObject | JsonPlainArray | undefined;
}

export type JsonValue = JsonPrimitive | JsonPlainObject | JsonPlainArray | undefined;

export type JsonObject = JsonPlainObject;
export type JsonArray = JsonPlainArray;

export interface TestCase {
  id?: string;
  input: string;
  expected_output: string;
  is_hidden?: boolean;
  points?: number;
  actual_output?: string;
  passed?: boolean;
  execution_time?: number;
  exit_code?: number;
  error_message?: string;
}

export interface ExecutionResult {
  success: boolean;
  passed: boolean;
  score: number;
  total_points: number;
  test_results: TestCase[];
  overall_result: {
    stdout: string;
    stderr: string;
    execution_time: number;
    memory_used: number;
    exit_code: number;
  };
  attempt_id?: string;
  userAnswer?: string;
  timeSpent?: number;
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  table_name?: string;
  columns?: string[];
  creation_sql?: string;
  creation_python?: string;
  data_creation_sql?: string;
  data_creation_python?: string;
  dataset_csv_raw?: string;
  subject_type?: PracticeQuestionType;
  file_url?: string;
  record_count?: number;
  data?: JsonObject[];
  schema_info?: JsonObject;
  data_preview?: JsonObject[];
}

export interface Question {
  id: string;
  exercise_id: string;
  question_number: number;
  text: string;
  type: PracticeQuestionType;
  language?: string;
  answer_text?: string | string[] | null;
  correct_answer?: string | string[] | null;
  solution?: string | null;
  hint?: string;
  explanation?: string;
  starter_code?: string;
  expected_runtime?: number;
  test_cases?: TestCase[];
  content?: JsonObject;
  sample_data?: JsonValue;
  expected_output_table?: string[];
  expected_answer?: string;
  sample_output?: string;
  dataset_description?: string;
  difficulty?: string;
  topics?: string[];
  order_index: number;
  points?: number;
  latestSubmission?: {
    userAnswer?: string;
    isCorrect?: boolean;
    score?: number;
    feedback?: string | null;
    verdict?: string;
    evaluation?: { verdict?: string; feedback?: string } | null;
    submittedAt?: string;
    attemptNumber?: number;
  };
  latestHint?: {
    verdict?: string;
    message?: string;
    userAnswer?: string;
    datasetContext?: string;
    requestedAt?: string;
    rawResponse?: unknown;
  };
  case_study_context?: string;
  business_context?: string;
}

export interface Exercise {
  id: string;
  title: string;
  description?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  type: ExerciseType;
  questions: Question[];
  datasets: Dataset[];
  business_context?: string;
  created_at?: string;
  updated_at?: string;
}

// AI-related interfaces for enhanced practice area
export interface SubmissionEvaluationRequest {
  questionId: string;
  question: string;
  expectedAnswer: string;
  studentAnswer: string;
  subject?: string;
  topicHierarchy?: string;
  futureTopics?: string[];
}

export interface SubmissionEvaluationResponse {
  verdict: string;
  feedback: string;
  rawResponse?: string;
}

export interface HintRequest {
  questionId: string;
  question: string;
  expectedAnswer: string;
  studentAnswer: string;
  subject?: string;
  topicHierarchy?: string;
  futureTopics?: string[];
  currentCode?: string;
  datasetContext?: string;
  hintLevel?: 'basic' | 'detailed' | 'partial';
}

export interface HintResponse {
  verdict: string;
  message: string;
  rawResponse?: string;
}

export interface HintResult {
  success: boolean;
  message: string;
  hint?: string;
  rawResponse?: string;
  hintLevel?: 'basic' | 'detailed' | 'partial';
}

export interface AISubmissionResult {
  success: boolean;
  passed: boolean;
  verdict: string;
  feedback: string;
  rawResponse?: string;
  userAnswer: string;
  timeSpent?: number;
  isAIEvaluated: boolean;
  aiEvaluation?: {
    verdict: string;
    feedback: string;
    raw_response?: string;
  } | null;
}

export interface AIHintResult {
  verdict: string;
  message: string;
  hintLevel?: 'basic' | 'detailed' | 'partial';
  hintCount: number;
  rawResponse?: string;
}

export interface PracticeInterfaceRouterProps {
  exerciseId: string;
  questionId: string;
  initialCode?: string;
  title: string;
  description: string;
  subjectType?: string;
  language?: string;
  onSubmit?: (result: ExecutionResult | AISubmissionResult) => void;
}

export interface SqlPracticeInterfaceProps {
  exerciseId: string;
  questionId: string;
  initialCode?: string;
  title: string;
  description: string;
  onSubmit?: (result: ExecutionResult) => void;
}

export interface PythonPracticeInterfaceProps {
  exerciseId: string;
  questionId: string;
  initialCode?: string;
  title: string;
  description: string;
  subjectType?: 'python' | 'statistics';
  onSubmit?: (result: ExecutionResult) => void;
}

export interface PracticeCodingInterfaceProps {
  exerciseId: string;
  questionId: string;
  initialCode?: string;
  title: string;
  description: string;
  subjectType?: string;
  onSubmit?: (result: ExecutionResult) => void;
}

export interface MentorChatMessage {
  role: 'mentor' | 'student';
  content: string;
  created_at?: string | null;
}

export interface MentorChatSession {
  question: { id: string; text: string };
  config: {
    context: string;
    hypothesis: string;
    guidingQuestion: string;
    targetQuestions: string[];
    introMessage?: string | null;
  };
  chat: {
    id: string | null;
    status: 'active' | 'completed';
    messages: MentorChatMessage[];
    identified_questions: string[];
    final_summary?: string | null;
    completed_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  ai?: {
    message: string;
    identified_questions: string[];
    status: 'coaching' | 'completed';
  };
  exercise?: {
    id?: string | null;
    title?: string | null;
    description?: string | null;
  };
  section?: {
    id?: string | null;
    title?: string | null;
    overview?: string | null;
  };
}

export interface PracticeMentorChatProps {
  exerciseId?: string;
  exerciseTitle?: string;
  exerciseDescription?: string;
  sectionTitle?: string;
  sectionOverview?: string;
  questions: Question[];
  activeQuestionId: string | null;
  sessions: Record<string, MentorChatSession | undefined>;
  loadingStates: Record<string, boolean>;
  sendingStates: Record<string, boolean>;
  errorStates: Record<string, string>;
  onSelectQuestion: (questionId: string, exerciseId?: string) => void;
  onLoadSession: (questionId: string, exerciseId?: string) => void;
  onSendMessage: (questionId: string, message: string, exerciseId?: string) => Promise<void> | void;
}

// Enhanced practice area props for AI integration
export interface PracticeAreaAIProps {
  questions: Question[];
  datasets: Dataset[];
  exerciseType: PracticeQuestionType;
  exerciseTitle?: string;
  exerciseDifficulty?: string | null;
  businessContext?: string;
  datasetDescription?: string;
  dataCreationSql?: string;
  exerciseId: string;
  activeQuestionIndex?: number;
  onCodeChange?: (code: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  aiEvaluation?: (request: SubmissionEvaluationRequest) => Promise<AISubmissionResult | null>;
  aiHint?: (request: HintRequest) => Promise<AIHintResult | null>;
  onRequestHint?: (
    questionId: string,
    solution: string,
    payload?: {
      question?: string;
      datasetContext?: string;
      expectedAnswer?: string;
    },
  ) => Promise<HintResult | null>;
  timeSpent?: number;
}

export type PracticeAreaAIEvaluationHandler = PracticeAreaAIProps['aiEvaluation'];
export type PracticeAreaAIHintHandler = PracticeAreaAIProps['aiHint'];
