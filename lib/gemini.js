import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY is missing in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export const geminiModel = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash" 
});

/**
 * Helper to generate structured JSON or text from Gemini
 */
export async function generateContent(prompt) {
    try {
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}
