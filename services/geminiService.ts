import { GoogleGenAI } from "@google/genai";
import { SearchResponse, WebSource, QuizQuestion, QuizConfig, Attachment } from "../types";

// Initialize the client
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
console.log("API Key:", apiKey ? "Set" : "Missing");
const ai = new GoogleGenAI({ apiKey });
export const performSearch = async (query: string, attachments: Attachment[] = []): Promise<SearchResponse> => {
    try {
        const parts: any[] = [];

        // Add attachments first
        attachments.forEach(att => {
            parts.push({
                inlineData: {
                    mimeType: att.mimeType,
                    data: att.base64
                }
            });
        });

        // Add text query
        if (query) {
            parts.push({ text: query });
        }

        // Determine config. If we have attachments, we still want grounding,
        // but typically grounding is most effective with text.
        // However, Gemini 2.5 supports multimodal grounding.
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            content: parts,
            config: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            }
        });

        // Extract response text
        const textResponse = response.text || "No response generated";

        // Mock web sources for now (replace with actual grounding data if available)
        const webSources: WebSource[] = [
            {
                title: "Gemini AI Documentation",
                url: "https://ai.google.dev",
                snippet: "Official documentation for Google's Gemini AI models."
            },
            {
                title: "AI Search Best Practices",
                url: "https://example.com/ai-search",
                snippet: "How to implement effective AI-powered search systems."
            }
        ];

        // Generate quiz questions if requested in query
        const quizQuestions: QuizQuestion[] = [];
        if (query.toLowerCase().includes("quiz")) {
            quizQuestions.push({
                question: "What is Gemini AI?",
                options: [
                    "A search engine",
                    "An AI model by Google",
                    "A web browser",
                    "A programming language"
                ],
                correctAnswer: 1
            });
        }

        return {
            answer: textResponse,
            webSources,
            quizQuestions,
            suggestedQueries: [
                "How does Gemini AI work?",
                "What are the capabilities of Gemini 2.5?",
                "How to implement AI search?"
            ]
        };
    } catch (error) {
        console.error("Error performing search:", error);
        throw new Error("Failed to perform search. Please try again.");
    }
};

export const generateQuiz = async (config: QuizConfig): Promise<QuizQuestion[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            content: `Generate ${config.numberOfQuestions} quiz questions about ${config.topic} at ${config.difficulty} difficulty.`,
            config: {
                temperature: 0.8,
                maxOutputTokens: 1024,
            }
        });

        // Parse response and return quiz questions
        // This is a simplified mock - you'll need to implement proper parsing
        return [
            {
                question: `Sample question about ${config.topic}`,
                options: ["Option 1", "Option 2", "Option 3", "Option 4"],
                correctAnswer: 0
            }
        ];
    } catch (error) {
        console.error("Error generating quiz:", error);
        throw new Error("Failed to generate quiz. Please try again.");
    }
};