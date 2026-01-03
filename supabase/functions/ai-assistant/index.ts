import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json()
    
    // Retrieve API Key from Secrets
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in Edge Function Secrets')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    let prompt = ""
    let systemInstruction = ""

    if (action === 'estimate_price') {
      const { scope } = payload
      systemInstruction = `You are a pragmatic software agency estimator for the Indian market. 
      Avoid overpricing. Provide competitive, "friendly" pricing that balances client budget with agency profitability.
      Currency: INR (₹).
      
      Response Format (JSON only):
      {
        "price": number (numeric value only),
        "timeline": "string (e.g. 2-3 Weeks)",
        "breakdown": "detailed string explanation"
      }`
      
      prompt = `${systemInstruction}\n\nProject Scope: ${scope}\n\nEstimate:`
    
    } else if (action === 'generate_marketing') {
      const { topic, type, platform, brief } = payload
      systemInstruction = `You are a viral content strategist for ${platform}.
      Create a ${type} script/brief based on the user's input.
      
      Response Format (JSON only):
      {
        "title": "Catchy Title",
        "hook": "First 3 seconds hook",
        "script": "Full script or detailed content brief",
        "hashtags": ["tag1", "tag2"]
      }`
      
      prompt = `${systemInstruction}\n\nTopic: ${topic}\nContent Type: ${type}\nAdditional Brief: ${brief}\n\nGenerate:`
    } else {
      throw new Error('Invalid action')
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Clean JSON if needed (remove markdown)
    const cleanText = text.replace(/```json|```/g, '').trim()

    return new Response(JSON.stringify({ data: JSON.parse(cleanText) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
