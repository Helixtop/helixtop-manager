import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY is missing in environment variables.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const geminiModel = genAI ? genAI.getGenerativeModel({ 
    model: "gemini-flash-latest",
    generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
    }
}) : null;

/**
 * Helper to generate structured JSON or text from Gemini
 */
export async function generateContent(prompt) {
    if (!geminiModel) {
        throw new Error("Gemini API is not configured. Please set GEMINI_API_KEY environment variable.");
    }
    
    try {
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        if (!text) {
            throw new Error("Empty response from Gemini API");
        }
        
        return text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        
        // Provide more specific error messages
        if (error.message?.includes("API key")) {
            throw new Error("Invalid Gemini API key. Please check your configuration.");
        } else if (error.message?.includes("quota")) {
            throw new Error("Gemini API quota exceeded. Please try again later.");
        } else if (error.message?.includes("network")) {
            throw new Error("Network error connecting to Gemini API.");
        }
        
        throw new Error(`Gemini API Error: ${error.message}`);
    }
}

/**
 * Generate content suggestions for marketing
 */
export async function generateMarketingIdeas(platform, description) {
    const prompt = `
You are a creative social media content strategist. 
Generate 3 engaging content ideas for ${platform} based on this description:
"${description}"

Return ONLY a JSON array with this structure:
[
  {"title": "idea title", "hook": "engaging opening line"},
  {"title": "idea title 2", "hook": "engaging opening line 2"},
  {"title": "idea title 3", "hook": "engaging opening line 3  "}
]
    `.trim();

    try {
        const response = await generateContent(prompt);
        // Clean response - remove code blocks if present
        const cleanedResponse = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanedResponse);
    } catch (error) {
        console.error("Marketing Ideas Generation Error:", error);
        throw error;
    }
}
