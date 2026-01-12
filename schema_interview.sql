-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.interview_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id integer NOT NULL,
  exercise_id integer NOT NULL,
  user_answer text NOT NULL,
  score integer NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  feedback text,
  test_results jsonb,
  attempt_number integer NOT NULL DEFAULT 1,
  time_spent integer,
  attempt_duration integer,
  topic character varying,
  difficulty character varying,
  tags character varying,
  company_name character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.interview_exercise_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  question_id uuid NOT NULL,
  code text NOT NULL,
  language character varying NOT NULL DEFAULT 'sql'::character varying,
  execution_result jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.interview_exercise_evaluations (
  id integer NOT NULL,
  attempt_id integer,
  execution_time integer,
  test_cases jsonb,
  hints_used jsonb,
  dataset_context jsonb,
  evaluation_metadata jsonb
);
CREATE TABLE public.interview_exercise_mentor_chat (
  id integer NOT NULL DEFAULT nextval('interview_exercise_mentor_chat_id_seq'::regclass),
  user_id uuid,
  question_id integer,
  role character varying,
  message text,
  created_at timestamp without time zone
);
CREATE TABLE public.interview_exercise_question_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  question_id uuid NOT NULL,
  user_answer text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  score integer NOT NULL DEFAULT 0,
  feedback text,
  execution_result jsonb,
  attempt_number integer NOT NULL DEFAULT 1,
  time_spent_seconds integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.interview_job_descriptions (
  id bigint NOT NULL DEFAULT nextval('interview_job_descriptions_id_seq'::regclass),
  user_id uuid NOT NULL,
  job_description text NOT NULL,
  source_type character varying DEFAULT 'paste'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  original_filename character varying
);
CREATE TABLE public.interview_practice_answers (
  id uuid NOT NULL,
  question_id uuid NOT NULL,
  answer_text text,
  is_case_sensitive boolean DEFAULT false,
  explanation text,
  CONSTRAINT interview_practice_answers_pkey PRIMARY KEY (id),
  CONSTRAINT interview_practice_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_practice_questions(id)
);
CREATE TABLE public.interview_practice_datasets (
  id uuid NOT NULL,
  exercise_id uuid,
  question_id uuid,
  name character varying,
  description text,
  table_name character varying,
  columns ARRAY,
  schema_info jsonb,
  creation_sql text,
  creation_python text,
  csv_data text,
  record_count integer,
  subject_type character varying,
  created_at timestamp without time zone,
  CONSTRAINT interview_practice_datasets_pkey PRIMARY KEY (id),
  CONSTRAINT interview_practice_datasets_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.interview_practice_exercises(id),
  CONSTRAINT interview_practice_datasets_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_practice_questions(id)
);
CREATE TABLE public.interview_practice_exercises (
  id uuid NOT NULL,
  name character varying,
  description text,
  created_at timestamp without time zone,
  CONSTRAINT interview_practice_exercises_pkey PRIMARY KEY (id)
);
CREATE TABLE public.interview_practice_question_topics (
  question_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  CONSTRAINT interview_practice_question_topics_pkey PRIMARY KEY (question_id, topic_id),
  CONSTRAINT interview_practice_question_topics_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_practice_questions(id),
  CONSTRAINT interview_practice_question_topics_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id)
);
CREATE TABLE public.interview_practice_questions (
  id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  question_number integer,
  text text,
  type character varying,
  language character varying,
  difficulty text,
  topics ARRAY,
  points integer,
  content jsonb,
  expected_output_table ARRAY,
  created_at timestamp without time zone,
  CONSTRAINT interview_practice_questions_pkey PRIMARY KEY (id),
  CONSTRAINT interview_practice_questions_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.interview_practice_exercises(id)
);
CREATE TABLE public.problem_solving_case_studies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_id bigint NOT NULL,
  exercise_id uuid NOT NULL,
  question_id uuid NOT NULL,
  title text,
  description text,
  problem_statement text,
  business_problem text,
  case_study_context text,
  estimated_time_minutes integer,
  difficulty text,
  topics text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT problem_solving_case_studies_pkey PRIMARY KEY (id),
  CONSTRAINT problem_solving_case_studies_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.interview_prep_plans(id),
  CONSTRAINT problem_solving_case_studies_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.interview_practice_exercises(id),
  CONSTRAINT problem_solving_case_studies_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_practice_questions(id)
);
CREATE TABLE public.interview_practice_test_cases (
  id uuid NOT NULL,
  question_id uuid NOT NULL,
  input text,
  expected_output text,
  is_hidden boolean DEFAULT false,
  points integer,
  created_at timestamp without time zone,
  CONSTRAINT interview_practice_test_cases_pkey PRIMARY KEY (id),
  CONSTRAINT interview_practice_test_cases_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_practice_questions(id)
);
CREATE TABLE public.interview_prep_plans (
  id bigint NOT NULL DEFAULT nextval('interview_prep_plans_id_seq'::regclass),
  user_id uuid NOT NULL,
  profile_id bigint NOT NULL,
  jd_id bigint NOT NULL,
  plan_content jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  domain_knowledge_text text,
  CONSTRAINT interview_prep_plans_pkey PRIMARY KEY (id)
);
CREATE TABLE public.interview_profiles (
  id bigint NOT NULL DEFAULT nextval('interview_profiles_id_seq'::regclass),
  user_id uuid NOT NULL UNIQUE,
  email character varying,
  experience_level character varying NOT NULL,
  target_role character varying NOT NULL,
  industry character varying NOT NULL,
  current_skills ARRAY NOT NULL,
  preparation_timeline_weeks integer NOT NULL,
  company_name character varying,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  timeline text,
  CONSTRAINT interview_profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.interview_question_hints (
  question_id uuid NOT NULL,
  verdict character varying NOT NULL,
  message text NOT NULL,
  user_answer text NOT NULL,
  dataset_context text,
  raw_response jsonb,
  created_at timestamp without time zone DEFAULT now()
);
CREATE TABLE public.topics (
  id uuid NOT NULL,
  name character varying UNIQUE,
  CONSTRAINT topics_pkey PRIMARY KEY (id)
);
