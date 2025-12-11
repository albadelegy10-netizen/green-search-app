export interface Attachment {
    mimeType: string;
    base64: string;
}

export interface WebSource {
    title: string;
    url: string;
    snippet: string;
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
}

export interface QuizConfig {
    topic: string;
    difficulty: string;
    numberOfQuestions: number;
}

export interface SearchResponse {
    answer: string;
    webSources: WebSource[];
    quizQuestions: QuizQuestion[];
    suggestedQueries: string[];
}