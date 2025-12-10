import { GoogleGenAI } from "@google/genai";
import { SearchResponse, WebSource, QuizQuestion, QuizConfig, Attachment } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let text = response.text || "No response generated.";
    
    // Extract grounding metadata
    const candidates = response.candidates || [];
    const groundingMetadata = candidates[0]?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const groundingSupports = groundingMetadata?.groundingSupports || [];

    // Process sources and create a mapping for deduplication
    const uniqueSources: WebSource[] = [];
    const chunkIndexToSourceIndex: number[] = [];

    groundingChunks.forEach((chunk: any, index: number) => {
        if (chunk.web) {
            const { uri, title } = chunk.web;
            let existingIndex = uniqueSources.findIndex(s => s.uri === uri);
            if (existingIndex === -1) {
                existingIndex = uniqueSources.length;
                uniqueSources.push({ uri, title });
            }
            chunkIndexToSourceIndex[index] = existingIndex;
        }
    });

    // Inject citations into text
    if (groundingSupports.length > 0) {
        // Sort supports by end index descending to insert from back to front
        const sortedSupports = [...groundingSupports].sort((a, b) => {
            const endA = a.segment?.endIndex ?? 0;
            const endB = b.segment?.endIndex ?? 0;
            return endB - endA;
        });

        for (const support of sortedSupports) {
            const endIndex = support.segment?.endIndex;
            const chunkIndices = support.groundingChunkIndices || [];
            
            if (endIndex !== undefined && chunkIndices.length > 0) {
                 // Get unique source indices
                 const sourceIndices = chunkIndices
                    .map((idx: number) => chunkIndexToSourceIndex[idx])
                    .filter((idx: number) => idx !== undefined)
                    .filter((val: number, i: number, arr: number[]) => arr.indexOf(val) === i) // Unique
                    .sort((a: number, b: number) => a - b);
                
                 if (sourceIndices.length > 0) {
                     const citation = ` [${sourceIndices.map((i: number) => i + 1).join(', ')}]`;
                     text = text.slice(0, endIndex) + citation + text.slice(endIndex);
                 }
            }
        }
    }

    return {
      text,
      sources: uniqueSources,
    };

  } catch (error: any) {
    console.error("Gemini Search Error:", error);
    throw new Error(error.message || "Failed to perform search");
  }
};

export const generateQuiz = async (config: QuizConfig): Promise<QuizQuestion[]> => {
    try {
        const styleContext = config.examStyle === 'Custom' 
            ? "General Knowledge or specific to the provided topic" 
            : `${config.examStyle} exam style`;

        const prompt = `
            Create a multiple choice quiz in JSON format.
            Topic: ${config.topic || "General Practice"}
            Exam Style Context: ${styleContext}
            Difficulty Level: ${config.difficulty}
            Number of Questions: ${config.questionCount}
            
            Instructions:
            1. The questions should strictly adhere to the requested difficulty and format.
            2. For mathematical formulas, use standard text and Unicode characters where appropriate to keep formulas readable. Avoid complex LaTeX syntax if a Unicode alternative exists.
               - Example: Use "x²" instead of "x^2".
               - Example: Use "√" instead of "\\sqrt".
               - Example: Use "(a/b)" instead of "\\frac{a}{b}".
            
            Output strictly a JSON array of objects. Do not wrap in markdown code blocks.
            Schema:
            [
                {
                    "question": "string",
                    "options": ["string", "string", "string", "string"],
                    "answerIndex": number (0-3),
                    "explanation": "string (brief explanation of why the answer is correct)"
                }
            ]
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) throw new Error("No data returned from Gemini");

        // Parse JSON
        const questions = JSON.parse(text) as QuizQuestion[];
        return questions;

    } catch (error: any) {
        console.error("Gemini Quiz Error:", error);
        throw new Error("Failed to generate quiz. Please try again.");
    }
};