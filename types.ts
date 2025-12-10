export interface WebSource {
  uri: string;
  title: string;
}

export interface SearchResponse {
  text: string;
  sources: WebSource[];
}

export interface Attachment {
  file: File;
  mimeType: string;
  base64: string; // Raw base64 string (without data URL prefix)
  previewUrl: string; // Data URL for display
}

export interface SearchState {
  query: string;
  attachments: Attachment[];
  isLoading: boolean;
  data: SearchResponse | null;
  error: string | null;
  hasSearched: boolean;
}

export type HistoryType = 'search' | 'quiz';

export interface BaseHistoryItem {
  id: string;
  timestamp: number;
  type: HistoryType;
}

export interface SearchHistoryItem extends BaseHistoryItem {
  type: 'search';
  query: string;
  data: SearchResponse;
}

export interface QuizHistoryItem extends BaseHistoryItem {
  type: 'quiz';
  topic: string;
  score: number;
  totalQuestions: number;
  examStyle: ExamStyle;
  difficulty: Difficulty;
  questions: QuizQuestion[];
  userAnswers: (number | null)[];
  config: QuizConfig;
}

export type HistoryItem = SearchHistoryItem | QuizHistoryItem;

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export type ExamStyle = 'SAT1' | 'EST1' | 'ACT1' | 'EST2' | 'ACT2' | 'Custom';
export type Difficulty = 'Mixed' | 'Medium' | 'Hard';

export interface QuizConfig {
  topic: string;
  questionCount: number;
  examStyle: ExamStyle;
  difficulty: Difficulty;
  timerEnabled: boolean;
}