import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '@/lib/supabase';

// Initialize Gemini Client for Server-Side Execution
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("[AI] WARNING: GEMINI_API_KEY is not defined in process.env. Local execution disabled.");
} else if (apiKey.includes("your_") || apiKey.length < 10) {
    console.warn("[AI] WARNING: GEMINI_API_KEY looks like a placeholder or is too short. Local execution may fail.");
} else {
    console.log(`[AI] Local GEMINI_API_KEY detected (${apiKey.substring(0, 5)}...). Local execution enabled.`);
}

const genAI = (apiKey && !apiKey.includes("your_")) ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Hub for all AI interactions.
 * Strategy:
 * 1. Try Local Execution (Server Action) if API Key is in env vars (Faster, no deployment needed)
 * 2. Fallback to Supabase Edge Function (If key is in Supabase Secrets)
 */
async function invokeAIAgent(action, payload) {
    try {
        // PRIORITY 1: Local Server Action (Fastest, no deployment needed)
        // This works if GEMINI_API_KEY is in your .env.local
        if (genAI) {
            console.log(`[AI] Executing ${action} via Local Server Action...`);
            return await runLocalAI(action, payload);
        }

        // PRIORITY 2: Supabase Edge Function
        // This is failing with 404 because the code isn't deployed to 'gvvxvncubzfsyfxdbmgr'
        console.log(`[AI] Attempting ${action} via Supabase Edge Function...`);
        const { data, error } = await supabase.functions.invoke('ai-assistant', {
            body: { action, payload }
        });

        if (error) {
            if (error.message?.includes('404')) {
                console.error("AI ERROR: Edge Function 'ai-assistant' not found on project 'gvvxvncubzfsyfxdbmgr'.");
                throw new Error("AI Setup Incomplete: The Edge Function code has not been deployed. Please add GEMINI_API_KEY to your .env.local file to fix this now.");
            }
            throw new Error(error.message || "AI Service unavailable");
        }

        return data.data;

    } catch (err) {
        console.error("AI Invocation Failed:", err);
        throw err;
    }
}

/**
 * Local implementation of the AI Logic 
 * (Mirrors the logic in supabase/functions/ai-assistant/index.ts)
 */
async function runLocalAI(action, payload) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    let prompt = "";
    let systemInstruction = "";

    if (action === 'estimate_price') {
        const { scope } = payload;
        systemInstruction = `You are a pragmatic software agency estimator for the Indian market. 
        Avoid overpricing. Provide competitive, "friendly" pricing that balances client budget with agency profitability.
        Currency: INR (₹).
        
        Response Format (JSON only):
        {
          "price": number (numeric value only),
          "timeline": "string (e.g. 2-3 Weeks)",
          "breakdown": "detailed string explanation"
        }`;
        
        prompt = `${systemInstruction}\n\nProject Scope: ${scope}\n\nEstimate:`;

    } else if (action === 'generate_marketing') {
        const { topic, type, platform, brief } = payload;
        systemInstruction = `You are a viral content strategist for ${platform}.
        Create a ${type} script/brief based on the user's input.
        
        Response Format (JSON only):
        {
          "title": "Catchy Title",
          "hook": "First 3 seconds hook",
          "script": "Full script or detailed content brief",
          "hashtags": ["tag1", "tag2"]
        }`;
        
        prompt = `${systemInstruction}\n\nTopic: ${topic}\nContent Type: ${type}\nAdditional Brief: ${brief}\n\nGenerate:`;
    } else {
        throw new Error("Invalid AI Action");
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean JSON (remove markdown)
    const cleanText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanText);
}

// --- Public Accessors ---

export async function generatePriceEstimateAI(scope) {
   return await invokeAIAgent('estimate_price', { scope });
}

export async function generateMarketingContentAI(topic, type, platform, brief) {
    return await invokeAIAgent('generate_marketing', { topic, type, platform, brief });
}
